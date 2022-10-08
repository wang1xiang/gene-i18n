const fs = require('fs');
const path = require('path');
const { commons, locales } = require('./config');
const translateApi = require('./translate');

const filePath = path.join(__dirname, '../../' + process.argv?.[2]);

/** 转换路径 */
const changePath = (path) => {
  const paths = path.split('\\');
  const pathLength = paths.length;
  return paths[pathLength - 2] + paths[pathLength - 1].slice(0, -1);
};

/** 生成文件 */
const generateFile = (keys) => {
  const output = changePath(filePath);
  const writeFile = (key, values) => {
    const locale = locales[key];
    const data = `export default ${JSON.stringify(values, null, 2)}`;
    console.log(` ✅ ${key}国际化文件生成成功`);
    fs.writeFileSync(locale + output, data, 'utf-8');
  };
  for (let key in locales) {
    key === 'zh'
      ? writeFile('zh', keys)
      : translateApi(keys, { from: 'zh', to: key }).then((res) => {
          writeFile(key, res);
        });
  }
};

/** 提取文案生成 */
const generateWord = () => {
  if (!process.argv?.[2]) {
    console.log(
      '\n🌈需要传入待国际化的文件路径 yarn gene-i18n ./src/xxx.tsx \n'
    );
    return;
  }
  const fileData = fs.readFileSync(filePath, 'utf-8');
  const lines = fileData.split(/\r?\n/);
  const keys: { [props: string]: string } = {};
  const allKeys = (line, index, symbol) => {
    let key = '';
    const includeIdLine = getId(lines, line, index, symbol);
    const includeMessageLine = getMessage(lines, line, index, symbol);
    const idReg = symbol === '=' ? /id='(([\s\S])*?)'/ : /id: '(([\s\S])*?)'/;
    includeIdLine.replace(idReg, (match, $1) => (key = $1));
    if (commons.includes(key)) return;
    /** 
     * 会出现这种情况
     * f({
          id: 'sms.tempalte.modal.desc',
          defaultMessage:
            '共享通道下短信进行营销，短信内容不能编辑改动，请检查无误后提交。',
        })
      */
    if (!includeMessageLine.includes(`defaultMessage${symbol}`)) {
      keys[key] = includeMessageLine.replace(/\'/g, '');
    } else {
      const mesReg =
        symbol === '='
          ? /defaultMessage='(([\s\S])*?)'/
          : /defaultMessage: '(([\s\S])*?)'/;
      includeMessageLine.replace(mesReg, (match, $1) => {
        key && (keys[key] = $1);
      });
    }
  };
  lines.forEach((line, index) => {
    if (line.includes('<FormattedMessage')) {
      allKeys(line, index, '=');
    } else if (
      line.includes('f({') ||
      (line.includes('f(') && lines[index + 1].trim() === '{')
    ) {
      const oneLine = line.includes('f({');
      allKeys(line, oneLine ? index : index + 1, ':');
    }
  });
  console.log(' ✅ 国际化文案整理成功 \n');
  return keys;
};

/** 获取id */
const getId = (lines, currentLine, index, symbol) =>
  currentLine.includes(`id${symbol}`) ? currentLine : lines[index + 1];
/** 获取defauleMessage */
const getMessage = (lines, currentLine, index, symbol) => {
  if (currentLine.includes(`defaultMessage${symbol}`)) {
    return currentLine;
  } else if (lines[index + 1].includes(`defaultMessage${symbol}`)) {
    return lines[index + 1];
    /**
     * 这种情况 那第三行数据
     * defaultMessage:
     *   '这是测试'
     */
  } else if (
    lines[index + 2].includes(`defaultMessage${symbol}`) &&
    lines[index + 2].trim().length > 17
  ) {
    return lines[index + 2];
  } else {
    let mes = lines[index + 3].trim();
    if (mes.endsWith(',') || mes.endsWith(';')) mes = mes.slice(0, -1);
    return mes;
  }
};
/**
 * 约定
 * 1. 原来的Intl.formatMessage() 以这种方式替换 const { formatMessage: f } = useIntl();
 * 2. <FormattedMessage 和 f({ 必须添加defaultMessage 作为中文的翻译
 * 3. 生成文件统一为locales/xx/messages/原始文件名
 */
const run = () => {
  const keys = generateWord();
  generateFile(keys);
};
run();
