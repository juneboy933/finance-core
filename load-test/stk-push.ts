/* eslint-disable @typescript-eslint/parser */
// @ts-nocheck
/// <reference types="k6" />
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

function generateRandomNumber() {
  const prefixes = ['2547', '2541'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const unique = `${__VU}${__ITER}`.padStart(8, '0').slice(-8);
  return `${prefix}${unique}`;
}

export default function () {
  const url = 'http://localhost:3000/api/v1/mpesa/stk-push';
  const payload = JSON.stringify({
    phoneNumber: generateRandomNumber(),
    amount: 1,
  });
  const res = http.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, {
    'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
  });
  sleep(1);
}

export {};
