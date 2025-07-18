import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  // Mochaテストを作成
  const mocha = new Mocha({
    ui: 'tdd', // suite, test, setup, teardown を使う "tdd" スタイルを指定
    color: true,
    timeout: 10000 // タイムアウトを10秒に設定
  });

  const testsRoot = __dirname;

  return new Promise((c, e) => {
    glob('**.spec.js', { cwd: testsRoot })
      .then(files => {
        // テストスイートにファイルを追加
        files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

        try {
          // Mochaテストを実行
          mocha.run(failures => {
            if (failures > 0) {
              e(new Error(`${failures} tests failed.`));
            } else {
              c();
            }
          });
        } catch (err) {
          console.error(err);
          e(err);
        }
      })
      .catch(err => {
        console.error(err);
        return e(err);
      });
  });
}