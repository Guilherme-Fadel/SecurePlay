import fastify from 'fastify';

const app = fastify({
    logger: true
});

app.get('/', async (request, reply) => {
  return reply.code(200).send({ message: 'Server is running' });
});

try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export default app;