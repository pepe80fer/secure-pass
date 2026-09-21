import sodium from 'libsodium-wrappers-sumo';

beforeAll(async () => {
  await sodium.ready;
});
