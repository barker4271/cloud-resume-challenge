const { app } = require('@azure/functions');

app.http('getVisits', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    context.log('getVisits function invoked');

    // Temporary test response (no storage yet)
    return {
      status: 200,
      jsonBody: {
        visits: 0
      }
    };
  }
});
