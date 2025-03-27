# Social Work Placements Mapper APP 

A web-based application for mapping and optimizing Social Work student placements at the University of Western Australia (UWA).

## 📌 Overview  

This project aims to simplify and improve the placement matching process for UWA's Social Work Field Education (FE) program. Currently, placements are managed manually using Excel spreadsheets and the Sonia database, which lacks geographic visualization. This application addresses these limitations by providing an interactive mapping interface, powerful filtering tools, and automated placement-matching functionality.

## 🚀 Key Features

- **Interactive Mapping**:  
  Visualizes the geographic locations of all stakeholders, including students, agencies, Liaison Officers (LOs), and External Field Educators (EFEs).

- **Advanced Filtering**:  
  Allows easy sorting of stakeholders by location, sector interests, availability, and specific placement requirements.

- **Automated Placement Matching**:  
  Suggests optimal student placements using algorithms based on defined priority rules and constraints, ensuring accuracy and fairness.

- **Secure User Authentication**:  
  Provides secure login and role-based access for placement coordinators.

- **Data Import/Export**:  
  Supports manual CSV uploads and allows exporting matched placement results as Excel files.

## 🛠️ Tech Stack  

- **Frontend:** HTML, CSS(Bootstrap), Javascript  
- **Backend:** Firebase Services  
- **Database:** Firebase Firestore
- **Mapping Services:** Mapbox GL JS  
- **Deployment:** Firebase Hosting  

## ✅ Project Structure  

```bash
├── public/                          
│   ├── index.html                   
│   ├── pages/                       
│   │   ├── login.html
│   │   ├── upload-file.html
│   │   ├── map-filter.html
│   │   └── matching.html
│   ├── css/                    
│   │   └── styles.css
│   ├── js/                         
│   │   ├── main.js
│   │   ├── uploade-file.js 
│   │   ├── map.js                  
│   │   ├── firebase.js              
│   │   └── matching.js         
│   └── assets/                      
│
├── firebase/                   
│   ├── functions/           
│   │   ├── index.js             
│   │   ├── matchingAlgorithm.js    
│   │   └── utils.js             
│   ├── firestore.rules             
│   ├── firebase.json              
│   ├── .firebaserc               
│   └── storage.rules       
│
├── data/                           
│   ├── sample_students.csv
│   ├── sample_agencies.csv
│   └── placement_results_sample.xlsx
│
├── docs/                    
│   └── requirements.md
│
└── README.md             
```

## 🗂️ Project Management and Documentation  

- **[MVP Development]([https://your-ms-teams-link](https://www.canva.com/design/DAGin7Rj58I/kZdoHJ8hQ24ZQW4_pUlEnw/edit))**  
- **[Project Meeting Notes]([https://your-docs-link](https://uniwa-my.sharepoint.com/:w:/g/personal/24109735_student_uwa_edu_au/EUK0KunCaBFGps-29fPur6oBKcsP0eXKYvDj4VNw3zGHIA?e=HQrYZm))**  
- **[Issue Tracking]([../../issues](https://github.com/JiehuaHuangg/SocialWorkPlacements/issues))**

## 📅 Project Timeline (Brief)

| Phase                 | Duration       | Status        |
|-----------------------|----------------|---------------|
| Planning & Research   | Weeks 1-3      | ✅ Completed  |
| Design & Prototyping  | Weeks 4-6      | ⏳ In progress |
| Development           | Weeks 7-9      | 🚧 Upcoming   |
| Testing & Deployment  | Weeks 10-12    | 🚧 Upcoming   |

## 👥 Team Members  

| Name            | Student ID   | GitHub ID      |
|-----------------|--------------|----------------|
| Alan Chacko     | 24085576     | @alan22222     |
| Jiehua Huang    | 24148088     | @JiehuaHuangg  |
| Mihir Tayshete  | 24109735     | @manmikalpha   |
| Xiaoyi Liu      | 24071255     | @leah1leah1    |
| Zongqi Wu       | 23957505     | @jacky-zq-woo  |

## 📌 How to Run Locally  
Follow these instructions to run the application locally.

**1. Clone the Repository**
```bash
git clone <[https://github.com/JiehuaHuangg/SocialWorkPlacements.git](https://github.com/JiehuaHuangg/SocialWorkPlacements.git)>
cd project-folder
```
**2. Install Firebase CLI**
```bash
npm install -g firebase-tools
```
**3. Log in to Firebase**
```bash
firebase login
```
**4. Run the App Locally**
Start the Firebase emulator to serve your app locally:
```bash
firebase serve
```
The application will now be accessible at:
```
http://localhost:5000
```


## 🎓 Academic Context

This project is being developed as part of the **CITS5206** Information Technology Capstone Project at the **University of Western Australia (UWA)**.
