# Shift Planner simulation (after)

60 days of back-to-back shifts per scenario; history window 10.

| Variant | Shift | Shifts | Slots | Empty | Dup in shift | Distinct | Max same | Slot: filled / distinct / 7-day repeats / wrong occasion / over time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 12h-day | 30 | 90 | 0 | 0 | 68 | 3 | breakfast: 30/22/0/0/0<br>lunch: 30/23/0/0/0<br>dinner: 30/28/0/0/0 |
| default | 12h-night | 30 | 60 | 0 | 0 | 42 | 5 | dinner: 30/22/0/0/0<br>late_night: 30/21/0/0/0 |
| default | 24h | 20 | 80 | 0 | 0 | 62 | 3 | breakfast: 20/18/0/0/0<br>lunch: 20/18/0/0/0<br>dinner: 20/18/0/0/0<br>late_night: 20/14/0/0/0 |
| default | 48h | 10 | 80 | 0 | 0 | 58 | 3 | breakfast: 20/17/0/0/0<br>lunch: 20/17/0/0/0<br>dinner: 20/19/0/0/0<br>late_night: 20/13/0/0/0 |
| default | 72h | 9 | 108 | 0 | 0 | 73 | 4 | breakfast: 27/21/0/0/0<br>lunch: 27/20/1/0/0<br>dinner: 27/21/0/0/0<br>late_night: 27/18/0/0/0 |
| no-history | 12h-day | 30 | 90 | 0 | 0 | 55 | 7 | breakfast: 30/18/3/0/0<br>lunch: 30/20/5/0/0<br>dinner: 30/25/4/0/0 |
| no-history | 12h-night | 30 | 60 | 0 | 0 | 33 | 13 | dinner: 30/19/7/0/0<br>late_night: 30/17/10/0/0 |
| no-history | 24h | 20 | 80 | 0 | 0 | 54 | 5 | breakfast: 20/18/0/0/0<br>lunch: 20/15/5/0/0<br>dinner: 20/19/1/0/0<br>late_night: 20/13/3/0/0 |
| no-history | 48h | 10 | 80 | 0 | 0 | 56 | 4 | breakfast: 20/18/0/0/0<br>lunch: 20/16/3/0/0<br>dinner: 20/18/2/0/0<br>late_night: 20/15/3/0/0 |
| no-history | 72h | 9 | 108 | 0 | 0 | 66 | 5 | breakfast: 27/19/4/0/0<br>lunch: 27/20/4/0/0<br>dinner: 27/20/1/0/0<br>late_night: 27/16/4/0/0 |
| vegetarian | 12h-day | 30 | 90 | 0 | 0 | 26 | 8 | breakfast: 30/11/4/0/0<br>lunch: 30/6/0/0/0<br>dinner: 30/9/0/0/0 |
| vegetarian | 12h-night | 30 | 60 | 0 | 0 | 10 | 10 | dinner: 30/7/0/0/0<br>late_night: 30/3/27/0/0 |
| vegetarian | 24h | 20 | 80 | 0 | 0 | 24 | 7 | breakfast: 20/10/1/0/0<br>lunch: 20/4/0/0/0<br>dinner: 20/7/0/0/0<br>late_night: 20/3/0/0/0 |
| vegetarian | 48h | 10 | 80 | 0 | 0 | 26 | 7 | breakfast: 20/10/1/0/0<br>lunch: 20/5/0/0/0<br>dinner: 20/9/0/0/0<br>late_night: 20/3/9/0/0 |
| vegetarian | 72h | 9 | 108 | 0 | 0 | 26 | 9 | breakfast: 27/9/0/0/0<br>lunch: 27/6/8/0/0<br>dinner: 27/9/0/0/0<br>late_night: 27/4/24/0/0 |
| pork-free | 12h-day | 30 | 90 | 0 | 0 | 60 | 4 | breakfast: 30/16/3/0/0<br>lunch: 30/20/0/0/0<br>dinner: 30/28/0/0/0 |
| pork-free | 12h-night | 30 | 60 | 0 | 0 | 38 | 5 | dinner: 30/22/0/0/0<br>late_night: 30/18/0/0/0 |
| pork-free | 24h | 20 | 80 | 0 | 0 | 55 | 4 | breakfast: 20/12/1/0/0<br>lunch: 20/17/0/0/0<br>dinner: 20/18/0/0/0<br>late_night: 20/14/0/0/0 |
| pork-free | 48h | 10 | 80 | 0 | 0 | 57 | 4 | breakfast: 20/14/1/0/0<br>lunch: 20/17/0/0/0<br>dinner: 20/19/0/0/0<br>late_night: 20/14/0/0/0 |
| pork-free | 72h | 9 | 108 | 0 | 0 | 66 | 4 | breakfast: 27/16/0/0/0<br>lunch: 27/18/1/0/0<br>dinner: 27/21/0/0/0<br>late_night: 27/18/0/0/0 |
| no-seafood | 12h-day | 30 | 90 | 0 | 0 | 66 | 4 | breakfast: 30/22/0/0/0<br>lunch: 30/21/0/0/0<br>dinner: 30/28/0/0/0 |
| no-seafood | 12h-night | 30 | 60 | 0 | 0 | 38 | 4 | dinner: 30/21/0/0/0<br>late_night: 30/18/0/0/0 |
| no-seafood | 24h | 20 | 80 | 0 | 0 | 57 | 4 | breakfast: 20/17/0/0/0<br>lunch: 20/17/0/0/0<br>dinner: 20/18/0/0/0<br>late_night: 20/12/0/0/0 |
| no-seafood | 48h | 10 | 80 | 0 | 0 | 57 | 4 | breakfast: 20/17/0/0/0<br>lunch: 20/18/0/0/0<br>dinner: 20/18/0/0/0<br>late_night: 20/14/0/0/0 |
| no-seafood | 72h | 9 | 108 | 0 | 0 | 70 | 4 | breakfast: 27/22/0/0/0<br>lunch: 27/21/1/0/0<br>dinner: 27/20/0/0/0<br>late_night: 27/14/0/0/0 |
| goal-high-protein | 12h-day | 30 | 90 | 0 | 0 | 72 | 3 | breakfast: 30/22/0/0/0<br>lunch: 30/24/0/0/0<br>dinner: 30/30/0/0/0 |
| goal-high-protein | 12h-night | 30 | 60 | 0 | 0 | 40 | 5 | dinner: 30/27/0/0/0<br>late_night: 30/17/0/0/0 |
| goal-high-protein | 24h | 20 | 80 | 0 | 0 | 65 | 3 | breakfast: 20/19/0/0/0<br>lunch: 20/15/0/0/0<br>dinner: 20/19/0/0/0<br>late_night: 20/15/0/0/0 |
| goal-high-protein | 48h | 10 | 80 | 0 | 0 | 59 | 3 | breakfast: 20/16/0/0/0<br>lunch: 20/15/0/0/0<br>dinner: 20/18/0/0/0<br>late_night: 20/17/0/0/0 |
| goal-high-protein | 72h | 9 | 108 | 0 | 0 | 74 | 4 | breakfast: 27/22/0/0/0<br>lunch: 27/21/0/0/0<br>dinner: 27/26/0/0/0<br>late_night: 27/18/0/0/0 |
| goal-lower-calorie | 12h-day | 30 | 90 | 0 | 0 | 73 | 3 | breakfast: 30/22/0/0/0<br>lunch: 30/24/0/0/0<br>dinner: 30/29/0/0/0 |
| goal-lower-calorie | 12h-night | 30 | 60 | 0 | 0 | 43 | 4 | dinner: 30/27/0/0/0<br>late_night: 30/19/0/0/0 |
| goal-lower-calorie | 24h | 20 | 80 | 0 | 0 | 61 | 3 | breakfast: 20/18/0/0/0<br>lunch: 20/16/0/0/0<br>dinner: 20/19/0/0/0<br>late_night: 20/13/0/0/0 |
| goal-lower-calorie | 48h | 10 | 80 | 0 | 0 | 58 | 3 | breakfast: 20/15/0/0/0<br>lunch: 20/15/0/0/0<br>dinner: 20/19/0/0/0<br>late_night: 20/15/0/0/0 |
| goal-lower-calorie | 72h | 9 | 108 | 0 | 0 | 78 | 4 | breakfast: 27/22/0/0/0<br>lunch: 27/24/0/0/0<br>dinner: 27/25/0/0/0<br>late_night: 27/18/0/0/0 |
| goal-lower-carb | 12h-day | 30 | 90 | 0 | 0 | 73 | 3 | breakfast: 30/22/0/0/0<br>lunch: 30/25/0/0/0<br>dinner: 30/29/0/0/0 |
| goal-lower-carb | 12h-night | 30 | 60 | 0 | 0 | 41 | 4 | dinner: 30/26/0/0/0<br>late_night: 30/18/0/0/0 |
| goal-lower-carb | 24h | 20 | 80 | 0 | 0 | 64 | 4 | breakfast: 20/18/0/0/0<br>lunch: 20/16/0/0/0<br>dinner: 20/19/0/0/0<br>late_night: 20/13/0/0/0 |
| goal-lower-carb | 48h | 10 | 80 | 0 | 0 | 60 | 3 | breakfast: 20/17/0/0/0<br>lunch: 20/16/0/0/0<br>dinner: 20/20/0/0/0<br>late_night: 20/14/0/0/0 |
| goal-lower-carb | 72h | 9 | 108 | 0 | 0 | 75 | 4 | breakfast: 27/21/0/0/0<br>lunch: 27/21/1/0/0<br>dinner: 27/27/0/0/0<br>late_night: 27/17/0/0/0 |
| goal-balanced | 12h-day | 30 | 90 | 0 | 0 | 68 | 4 | breakfast: 30/19/0/0/0<br>lunch: 30/23/0/0/0<br>dinner: 30/29/0/0/0 |
| goal-balanced | 12h-night | 30 | 60 | 0 | 0 | 41 | 4 | dinner: 30/25/0/0/0<br>late_night: 30/19/0/0/0 |
| goal-balanced | 24h | 20 | 80 | 0 | 0 | 60 | 3 | breakfast: 20/17/0/0/0<br>lunch: 20/14/0/0/0<br>dinner: 20/18/0/0/0<br>late_night: 20/14/0/0/0 |
| goal-balanced | 48h | 10 | 80 | 0 | 0 | 58 | 4 | breakfast: 20/15/0/0/0<br>lunch: 20/15/0/0/0<br>dinner: 20/19/0/0/0<br>late_night: 20/15/0/0/0 |
| goal-balanced | 72h | 9 | 108 | 0 | 0 | 75 | 3 | breakfast: 27/20/0/0/0<br>lunch: 27/23/0/0/0<br>dinner: 27/24/0/0/0<br>late_night: 27/18/0/0/0 |