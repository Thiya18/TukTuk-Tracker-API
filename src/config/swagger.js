import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tuk-Tuk Tracker API',
      version: '1.0.0',
      description: `
        ## Real-Time Three-Wheeler (Tuk-Tuk) Tracking & Movement Logging System
        Developed for Sri Lanka Police to support operational visibility and investigations.
        
      `,
      contact: { name: 'Sri Lanka Police IT Division' },
    },
    servers: [
      { url: '/api/v1', description: 'API v1' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'],
};

const swaggerSetup = (app) => {
  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customSiteTitle: 'Tuk-Tuk Tracker API Docs',
  }));
  // Expose raw JSON spec
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};

export default swaggerSetup;
