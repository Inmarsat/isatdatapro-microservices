const getStatuses = require('../src/services/getForwardStatuses');

const testGetStatuses = async() => {
  try {
    await getStatuses(console);
  } catch (err) {
    console.log(err);
  }
};
