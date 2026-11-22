# makefun-csv-reader-speed

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/mrifki12/makefun-csv-reader-speed/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/mrifki12/makefun-csv-reader-speed/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A one-pass, slice-based CSV reader that reproduces csv-reader 1.0.0's exact `{columns, rows, errors}` output on broken CSV (BOM, stray CR, quote junk, unterminated quotes, ragged rows) — verified byte-identical on the practice set, two drawn sets, and 6,070 differential fuzz cases, at roughly 2.5× the baseline's speed in local CPU benchmarks.

## Run it

```sh
node main.ts
```

Reads `/input/cases.json` and writes `/output/answers.json`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=g62qc6td&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>
