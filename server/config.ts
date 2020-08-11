import Koa from 'koa';

const axios = require('axios');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const secret = require('./server');

dotenv.config();

export default function loadConfig() {
  return axios.get(process.env.VADDR, {
    // VAULT 서버와 통신, 환경변수로 VAULT 주소 받음
    headers: {
      'X-Vault-Token': process.env.VAULT_TOKEN,
      // 환경변수로 VAULT 토큰 값 받음
    },
  }).then((res: any) => res.data.data.data).catch((err: any) => {
    console.log(err);
  });
}

function jwtDecoder(token: any, secretKey: any) {
  return new Promise(
    (resolve, reject) => {
      jwt.verify(token, secretKey, (error: any, decoded: any) => {
        if (error) reject(error);
        resolve(decoded);
      });
    },
  );
}

exports.jwtMiddleware = async (ctx: Koa.Context, next: any) => {
  const token = ctx.cookies.get('access_token');
  // 쿠키에 저장된 토큰을 가져옴
  if (!token) {
    ctx.throw(401, '인증 실패');
    // 토큰이 없을 경우 인증 실패
  }
  const secretKey = secret.env.accessSecretKey;
  // ctx.env에 저장된 로그인 토큰 암호화 키

  let decoded: typeof jwt;
  try {
    decoded = await jwtDecoder(token, secretKey);
    // 토큰을 디코드

    if (Date.now() / 1000 - decoded.iat > 60 * 50) {
      // 발행된지 50분이 지났을 경우 재발급
      // refresh token 사용하도록 수정할 것
      const user = decoded;
      // 디코딩한 정보

      const freshToken = jwt.sign(user, secretKey, { expiresIn: '1h' });
      // 새 토큰

      ctx.cookies.set('access_token', freshToken, { httpOnly: true, maxAge: 1000 * 60 * 60 });
      // 쿠키 새로 발급
    }
    ctx.user = decoded; // 유저 정보 update
    ctx.role = String(ctx.user.userNumber).charAt(0); // 권한 updatee
  } catch (error) {
    console.log(error);
    ctx.user = { // 에러일 경우 초기화
      _id: 0,
      userId: '',
      userName: '',
      userNumber: 0,
    };
  }
  return next();
};
/*
exports.envMiddleware = async (ctx: Koa.Context, next: any) => {
  try {
    const env = await loadConfig();
    ctx.env = env;
  } catch (error) {
    console.log(error);
    ctx.env = null;
  }
  return next();
};
*/
