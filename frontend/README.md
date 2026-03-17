# LivePulse 📰

A real-time news feed web application built with Node.js, Express, MongoDB, and Socket.io.

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)

---

## 🌟 Features

- 🔐 User registration and login with JWT authentication
- 📰 Real-time news feed using Socket.io
- 🗂️ Category-based news filtering (Technology, Sports, Education, Music)
- 🔍 Live search across articles
- 🔒 Password strength validation
- 🛡️ Secure password hashing with bcryptjs
- 📱 Responsive design

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Real-time | Socket.io |
| Authentication | JWT, bcryptjs |
| News Data | NewsAPI.org |

---

## 📁 Project Structure
```
livepulse/
├── server.js          ← backend server
├── package.json       ← dependencies
├── .env               ← secret keys (not uploaded)
└── frontend/
    ├── index.html     ← news feed page
    ├── login.html     ← login page
    ├── register.html  ← register page
    ├── script.js      ← frontend logic
    └── style.css      ← styling
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/PavithraVenkatagiri/livepulse.git
cd livepulse
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create .env file
```bash
MONGO_URI=your_mongodb_connection_string
NEWS_API_KEY=your_newsapi_key
JWT_SECRET=your_jwt_secret
PORT=5000
```

### 4. Run the server
```bash
node server.js
```

### 5. Open in browser
```
http://localhost:5000/login.html
```

---

## 🚀 Live Demo

👉 [Click here to try LivePulse](https://livepulse-production.up.railway.app/login.html)

---

## 📸 Screenshots

### Login Page
![Login Page](https://via.placeholder.com/800x400?text=Login+Page)

### News Feed
![News Feed](https://via.placeholder.com/800x400?text=News+Feed)

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/register` | Register a new user |
| POST | `/login` | Login and get token |
| GET | `/updates/:topic` | Get news by topic |

---

## 👩‍💻 Author

**Pavithra Venkatagiri**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/PavithraVenkatagiri)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).