# Shift Planner simulation (before)

60 days of back-to-back shifts per scenario; history window 10.

| Variant | Shift | Shifts | Slots | Empty | Dup in shift | Distinct | Max same | Slot: filled / distinct / 7-day repeats / wrong occasion / over time |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | 12h-day | 30 | 90 | 0 | 0 | 39 | 10 | breakfast: 30/22/0/0/0<br>lunch: 30/14/0/21/0<br>dinner: 30/3/27/10/0 |
| default | 12h-night | 30 | 60 | 0 | 0 | 11 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/10/0/2/0 |
| default | 24h | 20 | 80 | 0 | 0 | 36 | 7 | breakfast: 20/18/0/0/0<br>lunch: 20/11/0/11/0<br>dinner: 20/3/0/7/0<br>late_night: 20/9/0/1/0 |
| default | 48h | 10 | 80 | 0 | 0 | 37 | 7 | breakfast: 20/17/0/0/0<br>lunch: 20/12/0/14/0<br>dinner: 20/3/9/7/0<br>late_night: 20/9/0/2/0 |
| default | 72h | 9 | 108 | 0 | 0 | 42 | 9 | breakfast: 27/21/0/0/0<br>lunch: 27/14/3/19/0<br>dinner: 27/3/23/9/0<br>late_night: 27/9/0/0/0 |
| no-history | 12h-day | 30 | 90 | 0 | 0 | 37 | 21 | breakfast: 30/18/3/0/0<br>lunch: 30/16/5/21/0<br>dinner: 30/3/23/21/0 |
| no-history | 12h-night | 30 | 60 | 0 | 0 | 9 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/8/15/1/0 |
| no-history | 24h | 20 | 80 | 0 | 0 | 32 | 18 | breakfast: 20/18/0/0/0<br>lunch: 20/8/8/18/0<br>dinner: 20/2/17/18/0<br>late_night: 20/8/7/3/0 |
| no-history | 48h | 10 | 80 | 0 | 0 | 36 | 10 | breakfast: 20/18/0/0/0<br>lunch: 20/12/8/15/0<br>dinner: 20/3/16/10/0<br>late_night: 20/9/9/2/0 |
| no-history | 72h | 9 | 108 | 0 | 0 | 39 | 9 | breakfast: 27/19/4/0/0<br>lunch: 27/15/4/19/0<br>dinner: 27/3/18/9/0<br>late_night: 27/9/6/2/0 |
| vegetarian | 12h-day | 30 | 90 | 0 | 0 | 15 | 30 | breakfast: 30/11/4/0/0<br>lunch: 30/1/29/30/0<br>dinner: 30/3/27/10/0 |
| vegetarian | 12h-night | 30 | 60 | 0 | 0 | 2 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/1/29/30/0 |
| vegetarian | 24h | 20 | 80 | 0 | 20 | 14 | 40 | breakfast: 20/10/1/0/0<br>lunch: 20/1/19/20/0<br>dinner: 20/3/0/7/0<br>late_night: 20/1/19/20/0 |
| vegetarian | 48h | 10 | 80 | 0 | 30 | 14 | 40 | breakfast: 20/10/1/0/0<br>lunch: 20/1/19/20/0<br>dinner: 20/3/9/7/0<br>late_night: 20/1/19/20/0 |
| vegetarian | 72h | 9 | 108 | 0 | 45 | 13 | 54 | breakfast: 27/9/0/0/0<br>lunch: 27/1/26/27/0<br>dinner: 27/3/23/9/0<br>late_night: 27/1/26/27/0 |
| pork-free | 12h-day | 30 | 90 | 0 | 0 | 31 | 10 | breakfast: 30/16/3/0/0<br>lunch: 30/12/0/21/0<br>dinner: 30/3/27/10/0 |
| pork-free | 12h-night | 30 | 60 | 0 | 0 | 11 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/10/0/2/0 |
| pork-free | 24h | 20 | 80 | 0 | 0 | 30 | 7 | breakfast: 20/12/1/0/0<br>lunch: 20/11/0/11/0<br>dinner: 20/3/0/7/0<br>late_night: 20/9/0/1/0 |
| pork-free | 48h | 10 | 80 | 0 | 0 | 34 | 7 | breakfast: 20/14/1/0/0<br>lunch: 20/12/0/14/0<br>dinner: 20/3/9/7/0<br>late_night: 20/9/0/2/0 |
| pork-free | 72h | 9 | 108 | 0 | 0 | 36 | 9 | breakfast: 27/16/0/0/0<br>lunch: 27/13/2/20/0<br>dinner: 27/3/23/9/0<br>late_night: 27/9/0/0/0 |
| no-seafood | 12h-day | 30 | 90 | 0 | 0 | 35 | 10 | breakfast: 30/22/0/0/0<br>lunch: 30/10/0/16/0<br>dinner: 30/3/27/10/0 |
| no-seafood | 12h-night | 30 | 60 | 0 | 0 | 7 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/6/0/5/0 |
| no-seafood | 24h | 20 | 80 | 0 | 0 | 29 | 7 | breakfast: 20/17/0/0/0<br>lunch: 20/9/0/8/0<br>dinner: 20/3/0/7/0<br>late_night: 20/6/0/4/0 |
| no-seafood | 48h | 10 | 80 | 0 | 0 | 31 | 7 | breakfast: 20/17/0/0/0<br>lunch: 20/8/0/7/0<br>dinner: 20/3/9/7/0<br>late_night: 20/6/0/5/0 |
| no-seafood | 72h | 9 | 108 | 0 | 0 | 36 | 9 | breakfast: 27/22/0/0/0<br>lunch: 27/10/2/16/0<br>dinner: 27/3/23/9/0<br>late_night: 27/6/2/4/0 |
| goal-high-protein | 12h-day | 30 | 90 | 0 | 0 | 41 | 12 | breakfast: 30/22/0/0/0<br>lunch: 30/16/0/14/0<br>dinner: 30/3/18/12/0 |
| goal-high-protein | 12h-night | 30 | 60 | 0 | 0 | 13 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/12/0/3/0 |
| goal-high-protein | 24h | 20 | 80 | 0 | 0 | 41 | 8 | breakfast: 20/19/0/0/0<br>lunch: 20/16/0/10/0<br>dinner: 20/3/2/8/0<br>late_night: 20/11/0/2/0 |
| goal-high-protein | 48h | 10 | 80 | 0 | 0 | 35 | 8 | breakfast: 20/16/0/0/0<br>lunch: 20/14/0/11/0<br>dinner: 20/3/9/8/0<br>late_night: 20/11/0/0/0 |
| goal-high-protein | 72h | 9 | 108 | 0 | 0 | 42 | 9 | breakfast: 27/22/0/0/0<br>lunch: 27/14/1/13/0<br>dinner: 27/3/19/9/0<br>late_night: 27/12/1/1/0 |
| goal-lower-calorie | 12h-day | 30 | 90 | 0 | 0 | 40 | 12 | breakfast: 30/22/0/0/0<br>lunch: 30/15/0/17/0<br>dinner: 30/3/18/12/0 |
| goal-lower-calorie | 12h-night | 30 | 60 | 0 | 0 | 13 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/12/0/3/0 |
| goal-lower-calorie | 24h | 20 | 80 | 0 | 0 | 38 | 7 | breakfast: 20/18/0/0/0<br>lunch: 20/14/0/13/0<br>dinner: 20/3/0/7/0<br>late_night: 20/12/0/3/0 |
| goal-lower-calorie | 48h | 10 | 80 | 0 | 0 | 34 | 8 | breakfast: 20/15/0/0/0<br>lunch: 20/14/0/11/0<br>dinner: 20/3/9/8/0<br>late_night: 20/11/0/0/0 |
| goal-lower-calorie | 72h | 9 | 108 | 0 | 0 | 41 | 9 | breakfast: 27/22/0/0/0<br>lunch: 27/15/0/14/0<br>dinner: 27/3/19/9/0<br>late_night: 27/12/1/2/0 |
| goal-lower-carb | 12h-day | 30 | 90 | 0 | 0 | 39 | 12 | breakfast: 30/22/0/0/0<br>lunch: 30/14/0/18/0<br>dinner: 30/3/18/12/0 |
| goal-lower-carb | 12h-night | 30 | 60 | 0 | 0 | 13 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/12/0/3/0 |
| goal-lower-carb | 24h | 20 | 80 | 0 | 0 | 37 | 8 | breakfast: 20/18/0/0/0<br>lunch: 20/13/0/14/0<br>dinner: 20/3/3/8/0<br>late_night: 20/12/0/3/0 |
| goal-lower-carb | 48h | 10 | 80 | 0 | 0 | 35 | 8 | breakfast: 20/17/0/0/0<br>lunch: 20/14/0/12/0<br>dinner: 20/3/9/8/0<br>late_night: 20/11/0/0/0 |
| goal-lower-carb | 72h | 9 | 108 | 0 | 0 | 40 | 9 | breakfast: 27/21/0/0/0<br>lunch: 27/13/0/17/0<br>dinner: 27/3/19/9/0<br>late_night: 27/12/2/1/0 |
| goal-balanced | 12h-day | 30 | 90 | 0 | 0 | 38 | 12 | breakfast: 30/19/0/0/0<br>lunch: 30/16/0/13/0<br>dinner: 30/3/18/12/0 |
| goal-balanced | 12h-night | 30 | 60 | 0 | 0 | 13 | 30 | dinner: 30/1/29/30/0<br>late_night: 30/12/0/3/0 |
| goal-balanced | 24h | 20 | 80 | 0 | 0 | 38 | 8 | breakfast: 20/17/0/0/0<br>lunch: 20/14/0/12/0<br>dinner: 20/3/2/8/0<br>late_night: 20/11/0/3/0 |
| goal-balanced | 48h | 10 | 80 | 0 | 0 | 36 | 8 | breakfast: 20/15/0/0/0<br>lunch: 20/12/0/11/0<br>dinner: 20/3/9/8/0<br>late_night: 20/11/0/0/0 |
| goal-balanced | 72h | 9 | 108 | 0 | 0 | 41 | 9 | breakfast: 27/20/0/0/0<br>lunch: 27/17/0/12/0<br>dinner: 27/3/19/9/0<br>late_night: 27/12/1/1/0 |