import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { marked } from 'marked';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

interface HomeAssistantConfig {
  type: string;
  title?: string;
  agent_id?: string;
  show_tools?: boolean;
  placeholder?: string;
}

interface HomeAssistant {
  callWS: (request: any) => Promise<any>;
  connection: any;
}

interface AssistMessage {
  who: 'user' | 'hass';
  text: string;
  timestamp: Date;
  tool_calls?: ToolCall[];
  error?: boolean;
}

interface ToolCall {
  tool_name: string;
  tool_input: any;
  tool_output?: any;
  expanded?: boolean;
}

interface ConversationResponse {
  response: {
    speech: {
      plain: {
        speech: string;
      };
    };
    data?: {
      tool_calls?: ToolCall[];
    };
    extra_data?: {
      original_response?: string;
    };
  };
}

@customElement('homeassistant-assist-card')
export class HomeAssistantAssistCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: HomeAssistantConfig;
  @state() private _conversation: AssistMessage[] = [];
  @state() private _conversationId?: string;
  @state() private _inputText = '';
  @state() private _isLoading = false;

  static getStubConfig() {
    return {
      title: 'Assist',
      show_tools: true,
    };
  }

  public setConfig(config: HomeAssistantConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = config;

    // Initialize conversation with welcome message
    if (this._conversation.length === 0) {
      this._conversation = [
        {
          who: 'hass',
          text: 'How can I help you?',
          timestamp: new Date(),
        },
      ];
    }
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this._scrollToBottom();
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (changedProperties.has('_conversation')) {
      this._scrollToBottom();
    }
  }

  private _scrollToBottom(): void {
    setTimeout(() => {
      const container = this.shadowRoot?.querySelector('.conversation-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  private async _sendMessage(): Promise<void> {
    if (!this._inputText.trim() || this._isLoading) {
      return;
    }

    const userMessage: AssistMessage = {
      who: 'user',
      text: this._inputText.trim(),
      timestamp: new Date(),
    };

    this._conversation = [...this._conversation, userMessage];
    const messageText = this._inputText;
    this._inputText = '';
    this._isLoading = true;

    try {
      const response = await this._callAssistAPI(messageText);

      const assistMessage: AssistMessage = {
        who: 'hass',
        text:
          response.response.extra_data?.original_response || response.response.speech.plain.speech,
        timestamp: new Date(),
        tool_calls: response.response.data?.tool_calls,
      };

      this._conversation = [...this._conversation, assistMessage];
    } catch (error) {
      console.error('Error calling Assist API:', error);

      const errorMessage: AssistMessage = {
        who: 'hass',
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        error: true,
      };

      this._conversation = [...this._conversation, errorMessage];
    } finally {
      this._isLoading = false;
    }
  }

  private async _callAssistAPI(text: string): Promise<ConversationResponse> {
    const request: any = {
      type: 'conversation/process',
      text: text,
    };

    if (this._conversationId) {
      request.conversation_id = this._conversationId;
    }

    if (this._config?.agent_id) {
      request.agent_id = this._config.agent_id;
    }

    const response = await this.hass.callWS(request);

    // Store conversation ID for context
    if (response.conversation_id) {
      this._conversationId = response.conversation_id;
    }

    return response;
  }

  private _handleKeyPress(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._sendMessage();
    }
  }

  private _toggleToolCall(messageIndex: number, toolIndex: number): void {
    const message = this._conversation[messageIndex];
    if (message.tool_calls && message.tool_calls[toolIndex]) {
      const updatedConversation = [...this._conversation];
      updatedConversation[messageIndex] = {
        ...message,
        tool_calls: message.tool_calls.map((tool, idx) =>
          idx === toolIndex ? { ...tool, expanded: !tool.expanded } : tool
        ),
      };
      this._conversation = updatedConversation;
    }
  }

  private _renderMarkdown(text: string): string {
    try {
      return marked.parse(text, {
        async: false,
        breaks: true, // Enable line breaks (GitHub Flavored Markdown)
        gfm: true, // Enable GitHub Flavored Markdown
      }) as string;
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return text;
    }
  }

  private _renderToolCalls(message: AssistMessage, messageIndex: number) {
    if (!this._config?.show_tools || !message.tool_calls || message.tool_calls.length === 0) {
      return html``;
    }

    return html`
      <div class="tool-calls">
        ${message.tool_calls.map(
          (tool, toolIndex) => html`
            <div class="tool-call">
              <div
                class="tool-call-header"
                @click=${() => this._toggleToolCall(messageIndex, toolIndex)}
              >
                <span class="tool-icon">${tool.expanded ? '▼' : '▶'}</span>
                <span class="tool-name">Tool: ${tool.tool_name}</span>
              </div>
              ${tool.expanded
                ? html`
                    <div class="tool-call-details">
                      <div class="tool-section">
                        <div class="tool-section-title">Input:</div>
                        <pre>${JSON.stringify(tool.tool_input, null, 2)}</pre>
                      </div>
                      ${tool.tool_output
                        ? html`
                            <div class="tool-section">
                              <div class="tool-section-title">Output:</div>
                              <pre>${JSON.stringify(tool.tool_output, null, 2)}</pre>
                            </div>
                          `
                        : ''}
                    </div>
                  `
                : ''}
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderMessage(message: AssistMessage, index: number) {
    const isUser = message.who === 'user';
    const messageClass = `message ${isUser ? 'user-message' : 'assistant-message'} ${
      message.error ? 'error-message' : ''
    }`;

    return html`
      <div class=${messageClass}>
        <div class="message-content">
          <div class="message-text">
            ${isUser
              ? html`<div>${message.text}</div>`
              : html`<div class="markdown-content">
                  ${unsafeHTML(this._renderMarkdown(message.text))}
                </div>`}
          </div>
          ${this._renderToolCalls(message, index)}
        </div>
        <div class="message-timestamp">${message.timestamp.toLocaleTimeString()}</div>
      </div>
    `;
  }

  render() {
    if (!this._config) {
      return html``;
    }

    return html`
      <ha-card .header=${this._config.title}>
        <div class="card-content">
          <div class="conversation-container">
            ${this._conversation.map((message, index) => this._renderMessage(message, index))}
            ${this._isLoading
              ? html`
                  <div class="message assistant-message">
                    <div class="message-content">
                      <div class="loading-indicator">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                      </div>
                    </div>
                  </div>
                `
              : ''}
          </div>
          <div class="input-container">
            <textarea
              class="message-input"
              .value=${this._inputText}
              @input=${(e: Event) => (this._inputText = (e.target as HTMLTextAreaElement).value)}
              @keypress=${this._handleKeyPress}
              placeholder=${this._config.placeholder || 'Ask me anything...'}
              ?disabled=${this._isLoading}
              rows="1"
            ></textarea>
            <button
              class="send-button"
              @click=${this._sendMessage}
              ?disabled=${this._isLoading || !this._inputText.trim()}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
              </svg>
            </button>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    ha-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .card-content {
      display: flex;
      flex-direction: column;
      height: 600px;
      padding: 0;
    }

    .conversation-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--card-background-color, #fff);
    }

    .message {
      display: flex;
      flex-direction: column;
      max-width: 80%;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .user-message {
      align-self: flex-end;
    }

    .assistant-message {
      align-self: flex-start;
    }

    .message-content {
      padding: 12px 16px;
      border-radius: 16px;
      word-wrap: break-word;
    }

    .user-message .message-content {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }

    .assistant-message .message-content {
      background: var(--secondary-background-color, #f1f1f1);
      color: var(--primary-text-color, #000);
    }

    .error-message .message-content {
      background: var(--error-color, #f44336);
      color: #fff;
    }

    .message-timestamp {
      font-size: 0.75rem;
      color: var(--secondary-text-color, #888);
      margin-top: 4px;
      padding: 0 8px;
    }

    .user-message .message-timestamp {
      text-align: right;
    }

    .markdown-content {
      line-height: 1.6;
    }

    .markdown-content p {
      margin: 0.5em 0;
    }

    .markdown-content p:first-child {
      margin-top: 0;
    }

    .markdown-content p:last-child {
      margin-bottom: 0;
    }

    .markdown-content code {
      background: rgba(0, 0, 0, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }

    .markdown-content pre {
      background: rgba(0, 0, 0, 0.1);
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
    }

    .markdown-content pre code {
      background: none;
      padding: 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    .markdown-content h1,
    .markdown-content h2,
    .markdown-content h3,
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 {
      margin: 0.8em 0 0.4em 0;
      line-height: 1.3;
    }

    .markdown-content blockquote {
      border-left: 4px solid rgba(0, 0, 0, 0.2);
      margin: 0.5em 0;
      padding-left: 1em;
      color: var(--secondary-text-color, #666);
    }

    .markdown-content table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.5em 0;
    }

    .markdown-content th,
    .markdown-content td {
      border: 1px solid rgba(0, 0, 0, 0.2);
      padding: 8px;
      text-align: left;
    }

    .markdown-content th {
      background: rgba(0, 0, 0, 0.1);
      font-weight: bold;
    }

    .tool-calls {
      margin-top: 12px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      padding-top: 8px;
    }

    .tool-call {
      margin-bottom: 8px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 8px;
      overflow: hidden;
    }

    .tool-call-header {
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.05);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      transition: background 0.2s;
    }

    .tool-call-header:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .tool-icon {
      font-size: 0.8em;
      width: 16px;
      display: inline-block;
    }

    .tool-name {
      font-weight: 500;
      font-size: 0.9em;
    }

    .tool-call-details {
      padding: 12px;
      background: rgba(0, 0, 0, 0.02);
    }

    .tool-section {
      margin-bottom: 8px;
    }

    .tool-section:last-child {
      margin-bottom: 0;
    }

    .tool-section-title {
      font-weight: 600;
      font-size: 0.85em;
      margin-bottom: 4px;
      color: var(--secondary-text-color, #666);
    }

    .tool-section pre {
      background: rgba(0, 0, 0, 0.1);
      padding: 8px;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 0.85em;
      margin: 0;
      font-family: 'Courier New', monospace;
    }

    .input-container {
      display: flex;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
    }

    .message-input {
      flex: 1;
      padding: 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 20px;
      font-family: inherit;
      font-size: 14px;
      resize: none;
      outline: none;
      min-height: 44px;
      max-height: 120px;
    }

    .message-input:focus {
      border-color: var(--primary-color, #03a9f4);
    }

    .message-input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .send-button {
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 50%;
      background: var(--primary-color, #03a9f4);
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .send-button:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .send-button:active:not(:disabled) {
      transform: scale(0.95);
    }

    .send-button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .loading-indicator {
      display: flex;
      gap: 6px;
      padding: 8px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--primary-text-color, #000);
      opacity: 0.4;
      animation: pulse 1.4s infinite ease-in-out;
    }

    .dot:nth-child(1) {
      animation-delay: -0.32s;
    }

    .dot:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes pulse {
      0%,
      80%,
      100% {
        opacity: 0.4;
        transform: scale(1);
      }
      40% {
        opacity: 1;
        transform: scale(1.2);
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'homeassistant-assist-card': HomeAssistantAssistCard;
  }
}

// Register the card with Home Assistant
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'homeassistant-assist-card',
  name: 'Assist Card',
  description: 'Custom Assist card with Markdown and Tool Call support',
});
