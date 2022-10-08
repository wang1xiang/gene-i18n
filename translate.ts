const md5 = require('md5-node');
const axios = require('axios');
const config = require('./config');

let requestNumber = 0;

const apiCOnfig = {
  showProgress: true,
  requestNumber: 1,
  agreement: 'http',
  ...config,
};
const baiduApi = `${apiCOnfig.agreement}://api.fanyi.baidu.com/api/trans/vip/translate`;

const createUrl = (domain, form) => {
  let result = domain + '?';
  for (let key in form) {
    result += `${key}=${form[key]}&`;
  }
  return result.slice(0, result.length - 1);
};

const requestApi = (value, parames) => {
  if (requestNumber >= apiCOnfig.requestNumber) {
    return new Promise((resolve) => {
      setTimeout(() => {
        requestApi(value, parames).then((res) => {
          resolve(res);
        });
      }, 1000);
    });
  }
  requestNumber++;
  const { appid, secret } = apiCOnfig;
  const q = value;
  const salt = Math.random();
  const sign = md5(`${appid}${q}${salt}${secret}`);
  const fromData = {
    ...parames,
    q: encodeURIComponent(q),
    sign,
    appid,
    salt,
  };
  const fanyiApi = createUrl(baiduApi, fromData);
  return new Promise((resolve) => {
    axios
      .get(fanyiApi)
      .then(({ data: res }) => {
        // if (apiCOnfig.showProgress) 
        if (!res.error_code) {
          const resList = res.trans_result;
          resolve(resList);
        }
      })
      .finally(() => {
        setTimeout(() => {
          requestNumber--;
        }, 1000);
      });
  });
};

const translate = async (value, parames = { from: 'zh', to: 'en' }) => {
  let result: any = '';
  if (typeof value === 'string') {
    const res: any = await requestApi(value, parames);
    result = res?.[0]?.['dst'];
  }
  if (
    Array.isArray(value) ||
    Object.prototype.toString.call(value) === '[object Object]'
  ) {
    result = await _createObjValue(value, parames);
  }
  return result;
};

const _createObjValue = async (value, parames) => {
  let index = 0;
  const obj = Array.isArray(value) ? [] : {};
  const strDatas = Array.isArray(value) ? value : Object.values(value);
  const reqData = strDatas
    .filter((item) => typeof item === 'string')
    .join('\n');
  const res: any = reqData ? await requestApi(reqData, parames) : [];
  for (let key in value) {
    if (typeof value[key] === 'string') {
      obj[key] = res?.[index]?.['dst'];
      index++;
    }
    if (
      Array.isArray(value[key]) ||
      Object.prototype.toString.call(value[key]) === '[object Object]'
    ) {
      obj[key] = await translate(value[key], parames);
    }
  }
  return obj;
};

module.exports = translate;