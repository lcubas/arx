export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'chore', 'ci', 'build', 'revert'],
    ],
    // Keep subject line concise
    'subject-max-length': [2, 'always', 100],
    // Never end subject with a period
    'subject-full-stop': [2, 'never', '.'],
    // Lowercase subject
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
  },
};
