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

- **Frontend:** HTML, CSS (custom + Bootstrap), JavaScript (ES6 modules) 
- **Backend:** Firebase Services  
- **Database:** Firebase Firestore
- **Mapping Services:** Mapbox GL JS  
- **Testing:** Mocha, Chai (for logic/utilities)
- **Deployment:** Github Pages  

## ✅ Project Structure  

```bash
project-root/
├── .firebaserc                  # Firebase project config
├── .gitignore
├── firebase.json                # Firebase Hosting, Firestore, Storage config
├── README.md
├── config.json                  # (Optional) App config/settings
│
├── public/                      # All static assets (served by Firebase Hosting)
│   ├── index.html               # Main entry point
│   ├── pages/                   # Modular HTML pages (routed in-app)
│   │   ├── login.html
│   │   ├── manual.html
│   │   ├── map-filter.html
│   │   ├── match.html
│   │   ├── test.html
│   │   └── upload-file.html
│   ├── css/                     # Custom CSS by feature/page
│   │   ├── manual.css
│   │   ├── matching-settings.css
│   │   ├── nav.css
│   │   ├── styles.css
│   │   └── upload-file.css
│   ├── images/                  # Screenshots and UI assets
│   │   ├── login-screenshot.png
│   │   ├── manual-hero.png
│   │   ├── map-overview.png
│   │   ├── matching-overview.png
│   │   └── upload-steps.png
│   ├── js/                      # All main JS logic (ES6 modules)
│   │   ├── app.js               # Main entry/app logic
│   │   ├── auth.js              # Auth/signup/login logic
│   │   ├── auth-check.js        # Auth guard for protected pages
│   │   ├── firebase-config.js   # Firebase config/init
│   │   ├── logout.js            # Logout logic
│   │   ├── manual.js            # Help/manual page logic
│   │   ├── match.js             # Matching algorithm/logic
│   │   └── upload-file.js       # Excel upload & validation logic
│
├── firestore.rules              # Firestore security rules
├── storage.rules                # Firebase Storage security rules
          
```

## 🗂️ Project Management and Documentation  

- **[MVP Development]([https://your-ms-teams-link](https://www.canva.com/design/DAGin7Rj58I/kZdoHJ8hQ24ZQW4_pUlEnw/edit))**  
- **[Project Meeting Notes]([https://your-docs-link](https://uniwa-my.sharepoint.com/:w:/g/personal/24109735_student_uwa_edu_au/EUK0KunCaBFGps-29fPur6oBKcsP0eXKYvDj4VNw3zGHIA?e=HQrYZm))**  
- **[Issue Tracking]([../../issues](https://github.com/JiehuaHuangg/SocialWorkPlacements/issues))**

## 📅 Project Timeline (Brief)

| Phase                 | Duration       | Status        |
|-----------------------|----------------|---------------|
| Planning & Research   | Weeks 1-3      | ✅ Completed  |
| Design & Prototyping  | Weeks 4-6      | ✅ Completed  |
| Development           | Weeks 7-9      | ✅ Completed  |
| Testing & Deployment  | Weeks 10-12    | ✅ Completed  |

## 👥 Team Members  

| Name            | Student ID   | GitHub ID      |
|-----------------|--------------|----------------|
| Alan Chacko     | 24085576     | @alan22222     |
| Jiehua Huang    | 24148088     | @JiehuaHuangg  |
| Mihir Tayshete  | 24109735     | @manmikalpha   |
| Xiaoyi Liu      | 24071255     | @leah1leah1    |
| Zongqi Wu       | 23957505     | @jacky-zq-woo  |

## 📌 How to Run Locally  
Follow these instructions to run the application locally as a static site:

**1. Clone the Repository**
```bash
git clone <[https://github.com/JiehuaHuangg/SocialWorkPlacements.git](https://github.com/JiehuaHuangg/SocialWorkPlacements.git)>
cd SocialWorkPlacements
```
**2. Open the Application in Your Browser**
You can open the app directly from your file system:
Open public/index.html in your browser (or double-click it in your file explorer).
Recommended:
For the best experience with ES6 modules and local file security, use a simple HTTP server. For example:
```bash
cd public
python -m http.server 8080
```
Then open http://localhost:8080/ in your browser.
Or use Live Server in VSCode:
Right-click public/index.html and select "Open with Live Server".

Production deployment is on GitHub Pages
All Firebase features (authentication, Firestore, storage) work in the browser via the client SDK.


## 🎓 Academic Context

This project is being developed as part of the **CITS5206** Information Technology Capstone Project at the **University of Western Australia (UWA)**.
