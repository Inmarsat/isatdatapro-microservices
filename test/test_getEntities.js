const getEntity = require('../src/services/getEntity');

const category = 'MessageReturn';
const filter = {
  include: {},
  exclude: {},
  options: {
    limit: 3,
    desc: '_ts',
  }
};

/*
(async () => {
  console.log(await getEntity(category, filter));
})();
//*/