export interface MockInteractionOptions {
  userId?: string;
  guildId?: string;
  channelId?: string;
  options?: Map<string, any>;
}

export function createMockInteraction(opts: MockInteractionOptions = {}): any {
  const userId = opts.userId ?? 'user123';
  const guildId = opts.guildId ?? 'guild123';
  const channelId = opts.channelId ?? 'channel123';
  const options = opts.options ?? new Map();

  const replies: any[] = [];
  const modals: any[] = [];

  return {
    user: {
      id: userId,
    },
    guildId,
    channelId,
    options: {
      get: (name: string) => {
        const value = options.get(name);
        return value !== undefined ? { value } : undefined;
      },
    },
    reply: jest.fn(async (replyOptions: any) => {
      replies.push(replyOptions);
      return null as any;
    }),
    showModal: jest.fn(async (modal: any) => {
      modals.push(modal);
      return null as any;
    }),
    getReplies: () => replies,
    getModals: () => modals,
  };
}

export function getMockReplies(interaction: any): any[] {
  return interaction.getReplies?.() || [];
}

export function getMockModals(interaction: any): any[] {
  return interaction.getModals?.() || [];
}

export interface MockModalSubmitOptions {
  userId?: string;
  fields?: Map<string, string>;
}

export function createMockModalSubmit(opts: MockModalSubmitOptions = {}): any {
  const userId = opts.userId ?? 'user123';
  const fields = opts.fields ?? new Map();

  const replies: any[] = [];

  return {
    user: {
      id: userId,
    },
    fields: {
      getTextInputValue: (customId: string) => {
        return fields.get(customId) || '';
      },
    },
    reply: jest.fn(async (replyOptions: any) => {
      replies.push(replyOptions);
      return null as any;
    }),
    getReplies: () => replies,
  };
}
