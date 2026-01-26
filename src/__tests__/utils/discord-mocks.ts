/**
 * Create a mock Discord client with users, channels, and guilds fetch methods
 */
function createMockClient() {
  return {
    users: {
      fetch: jest.fn(async (id: string) => ({
        id,
        username: `MockUser_${id}`,
        send: jest.fn(async () => ({})),
      })),
    },
    channels: {
      fetch: jest.fn(async (id: string) => ({
        id,
        isTextBased: () => true,
        isDMBased: () => false,
        send: jest.fn(async () => ({})),
      })),
    },
    guilds: {
      fetch: jest.fn(async (id: string) => ({
        id,
        name: `MockGuild_${id}`,
      })),
    },
  };
}

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
    client: createMockClient(),
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
    deferReply: jest.fn(async () => {
      return null as any;
    }),
    editReply: jest.fn(async (replyOptions: any) => {
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
  guildId?: string;
  fields?: Map<string, string>;
}

export function createMockModalSubmit(opts: MockModalSubmitOptions = {}): any {
  const userId = opts.userId ?? 'user123';
  const guildId = opts.guildId ?? 'guild123';
  const fields = opts.fields ?? new Map();

  const replies: any[] = [];
  const followUps: any[] = [];

  return {
    user: {
      id: userId,
    },
    guildId,
    customId: 'mock-modal',
    client: createMockClient(),
    fields: {
      getTextInputValue: (customId: string) => {
        return fields.get(customId) || '';
      },
    },
    reply: jest.fn(async (replyOptions: any) => {
      replies.push(replyOptions);
      return null as any;
    }),
    deferReply: jest.fn(async (options: any) => {
      return null as any;
    }),
    deferUpdate: jest.fn(async () => {
      return null as any;
    }),
    editReply: jest.fn(async (replyOptions: any) => {
      replies.push(replyOptions);
      return null as any;
    }),
    followUp: jest.fn(async (replyOptions: any) => {
      followUps.push(replyOptions);
      return null as any;
    }),
    getReplies: () => replies,
    getFollowUps: () => followUps,
  };
}

export interface MockSelectMenuOptions {
  userId?: string;
  guildId?: string;
  customId?: string;
  values?: string[];
}

export function createMockSelectMenu(opts: MockSelectMenuOptions = {}): any {
  const userId = opts.userId ?? 'user123';
  const guildId = opts.guildId ?? 'guild123';
  const customId = opts.customId ?? 'test-select';
  const values = opts.values ?? [];

  const replies: any[] = [];
  const modals: any[] = [];

  return {
    user: {
      id: userId,
    },
    guildId,
    customId,
    values,
    client: createMockClient(),
    isStringSelectMenu: () => true,
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

export interface MockButtonOptions {
  userId?: string;
  guildId?: string;
  customId?: string;
}

export function createMockButton(opts: MockButtonOptions = {}): any {
  const userId = opts.userId ?? 'user123';
  const guildId = opts.guildId ?? 'guild123';
  const customId = opts.customId ?? 'test-button';

  const replies: any[] = [];
  const updates: any[] = [];

  return {
    user: {
      id: userId,
    },
    guildId,
    customId,
    client: createMockClient(),
    isButton: () => true,
    reply: jest.fn(async (replyOptions: any) => {
      replies.push(replyOptions);
      return null as any;
    }),
    update: jest.fn(async (updateOptions: any) => {
      updates.push(updateOptions);
      return null as any;
    }),
    getReplies: () => replies,
    getUpdates: () => updates,
  };
}

export function getMockUpdates(interaction: any): any[] {
  return interaction.getUpdates?.() || [];
}
