export function registerAuthTools(server, authManager) {
  server.tool('login', {}, async () => {
    try {
      const text = await new Promise((r) => {
        authManager.acquireTokenByDeviceCode(r);
      });
      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: `Authentication failed: ${error.message}` }),
          },
        ],
      };
    }
  });

  server.tool('logout', {}, async () => {
    try {
      await authManager.logout();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ message: 'Logged out successfully' }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'Logout failed' }),
          },
        ],
      };
    }
  });

  server.tool('verify-login', {}, async () => {
    const testResult = await authManager.testLogin();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(testResult),
        },
      ],
    };
  });
}
