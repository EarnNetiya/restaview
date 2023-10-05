const express = require("express");
const app = express();
const sqlite3 = require('sqlite3').verbose();
const {Client} = require("pg")
const restaview = new sqlite3.Database('./user.db');
const argon2 = require('argon2');
const JWT_SECRET = 'your-secret-key';
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const token = req.headers.authorization;
  
    if (!token) {
      return res.status(401).json({ message: 'Authentication failed: No token provided' });
    }
  
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Authentication failed: Invalid token' });
      }
      req.userId = decoded.userId; 
      next();
    });
  }
  

const client = new Client({
    host: 'node50593-yongyuth.proen.app.ruk-com.cloud',
    port: 11632,
    database: 'postgres',
    user: 'webadmin',
    password: 'lZTusDwkU3',
})

client.connect()


app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.get('/', (_,res) => {
    client.query(`SELECT * FROM restaurants `).then((result) => {
        for (let i of result.rows) {
           res.json(i)
        }
    
    })
    
});

app.get('/:id', (req,res) => {
    const params = req.params;
    client.query(`SELECT * FROM restaurants WHERE id = $1`, [params.id]).then((result) => {
        for (let i of result.rows) {
           res.json(i)
        }
    
    })
})
app.post('/', (req,res) => {
    const text = 'INSERT INTO restaurants(name, phone_number, location) VALUES($1, $2, $3)'
    const body = req.body;
    const values = [body.name, body.phone_number, body.location]
    const response = client.query(text, values)
    
    res.json(response.rows)
})

app.put('/:id', (req,res) => {
    const params = req.params;
    const body = req.body;
    const text = 'UPDATE restaurants SET name = $1, phone_number = $2, location = $3 WHERE id = $4 '
    const values = [body.name, body.phone_number, body.location, params.id]

    const response = client.query(text, values)
    
    res.json(response.rows)
})

app.delete('/:id', (req,res) => {
    const params = req.params;
    const text = 'DELETE FROM restaurants WHERE id = $1 '
    const values = [params.id]

    const response = client.query(text, values)
    
    res.json(response.rows)

})


app.post('/user', async (req,res) => {
    const body = req.body;
    let hash;
    try {
        hash = await argon2.hash(body.password);
    } catch (err) {
            console.log("Error")
    }
    
    const text = 'INSERT INTO users(email_address, firstname, lastname, password) VALUES($1, $2, $3, $4)'
    const values = [body.email_address, body.firstname, body.lastname, hash]
    const response = client.query(text, values)
    
   

    if (body.password.length < 8) {
        res.json({ password: "error"})
    }

    res.json(response.rows)
});

app.get('/get', verifyToken ,(req,res) => {
    res.json({ message: "asas" })
});

app.post('/login', async (req, res) => {
    const { email_address, password } = req.body;
  
    try {
      const result = await client.query('SELECT * FROM users WHERE email_address = $1', [email_address]);
  
      if (result.rows.length === 1) {
        const hashedPassword = result.rows[0].password; 
        if (await argon2.verify(hashedPassword, password)) {
           
            const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
          } else {
            res.status(401).json('Password incorrect');
          }
        } else {
          res.status(404).json('User not found');
        }
      } catch (err) {
        console.error(err);
        res.status(500).json('Internal server error');
      }
  });

const port = process.env.NP || 3000;
app.listen(port, ()=> {
    console.log(`listen port ${port}...`)
});

// dsawdshgas8 9cy8sap9