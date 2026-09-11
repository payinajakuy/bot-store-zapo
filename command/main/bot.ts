export default {
  name: 'bot',
  async execute(ctx: any) {
    const { client, event, text, replyTarget, pushName } = ctx;
    
    if (text.trim().toLowerCase() === 'bot') {
      const username = pushName || 'User';
      const response = `halo kak ${username} apa kabar`;
      
      
      await client.message.send(replyTarget, response, {
        quote: event 
      });
    }
  }
};
