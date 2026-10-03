const assert = require('node:assert/strict');
const { test } = require('node:test');

for (const [name, modulePath, exportName] of [
  ['audit', '../templates/audit-template', 'draftAuditWorkpaper'],
  ['interview', '../templates/interview-template', 'generateInterviewPrep'],
  ['resume', '../templates/resume-template', 'reviewResume'],
  ['songwriting', '../templates/songwriting-template', 'writeSong']
]) {
  test(`exports the ${name} starter function`, () => {
    const template = require(modulePath);
    assert.equal(typeof template[exportName], 'function');
  });
}
