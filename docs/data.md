# Triage dataset

File: [`data/dog_disease_prediction.xlsx`](../data/dog_disease_prediction.xlsx) (sheet "Dog Disease Data")

Sample data for the client app's AI triage: 75 dogs, each with symptoms and a predicted disease.

## Columns

| Column | Example | Notes |
|---|---|---|
| `Animal_Type` | Dog | All rows are dogs |
| `Breed` | Labrador | |
| `Age` | 4 | Years |
| `Gender` | Male | |
| `Weight` | 25 | |
| `Symptom_1` … `Symptom_4` | Fever, Lethargy, Appetite Loss, Vomiting | Up to four symptoms |
| `Duration` | 3 days | How long symptoms have lasted |
| `Appetite_Loss`, `Vomiting`, `Diarrhea`, `Coughing`, `Labored_Breathing`, `Lameness`, `Skin_Lesions`, `Nasal_Discharge`, `Eye_Discharge` | Yes / No | Symptom flags |
| `Body_Temperature` | 39.5°C | Usually measured by a vet |
| `Heart_Rate` | 120 | Usually measured by a vet |
| `Disease_Prediction` | Parvovirus | Target label |

## Gaps to fill before using it for triage

- **No urgency level.** Each disease needs a mapping to urgency Levels 1–4 (see [prd-client.md](prd-client.md)).
- **No cost.** Each disease or visit type needs a cost range for the price estimate screen.
- **Temperature and heart rate** can't be entered by most owners, so the questionnaire should not depend on them.
