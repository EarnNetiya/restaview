const express = require("express");
const app = express();
const sqlite3 = require('sqlite3').verbose();
const {Client} = require("pg")
const restaview = new sqlite3.Database('./user.db');
const argon2 = require('argon2');
const JWT_SECRET = 'your-secret-key';
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null) return res.sendStatus(401)

  jwt.verify(token, JWT_SECRET, (err, user) => {
    console.log(err)

    if (err) return res.sendStatus(403)
    req.user = user

    return next()
  })
}

function isValidEmail(email) {
  const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailPattern.test(email);
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

app.get('/reviews', async (req,res) => {
  const text = 'SELECT * FROM reviews ORDER BY updated_at ASC'
  const response = await client.query(text)
  
  return res.json(response.rows)
});

app.get('/:id', async (req,res) => {
    const params = req.params;
    client.query(`SELECT * FROM restaurants WHERE id = $1`, [params.id]).then((result) => {
        for (let i of result.rows) {
           res.json(i)
        }
    
    })
    const restaurants = await client.query(`SELECT * FROM restaurants WHERE id = $1`, [params.id]);
    if (restaurants.rowCount === 0) {
      return res.json({ message: "ไม่พบไอดีดังกล่าว" })
  }
});

app.get('/user/me', authenticateToken, async (req, res) => {
  const text = 'SELECT * FROM users WHERE id = $1';
  const values = [req.user.userId];
  const response = await client.query(text, values)

  return res.json(response.rows[0])
});

app.get('/reviews/me', authenticateToken, async (req, res) => {
  const text = 'SELECT * FROM reviews WHERE user_id = $1';
  const values = [req.user.userId];
  const response = await client.query(text, values)

  return res.json(response.rows[0])
});

app.post('/', (req,res) => {
  const text = 'INSERT INTO restaurants(name, phone_number, location) VALUES($1, $2, $3)'
  const body = req.body;
  const values = [body.name, body.phone_number, body.location]
  const response = client.query(text, values)
  if (body.phone_number.length !== 10) {
    return res.status(400).json({ error: "เบอร์โทรศัพท์ต้องมี 10 หลัก" });
  }

  res.json(response.rows)
})

app.put('/:id', async (req,res) => {
    const params = req.params;
    const body = req.body;
    const text = 'UPDATE restaurants SET name = $1, phone_number = $2, location = $3 WHERE id = $4 '
    const values = [body.name, body.phone_number, body.location, params.id]
    
    const restaurants = await client.query(text, values);
    if (restaurants.rowCount === 0) {
      return res.json({ message: "ไม่พบไอดีร้านอาหารดังกล่าว" })
  }
    const response = client.query(text, values)
    
    res.json(response.rows)
});


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
    
    if (!isValidEmail(body.email_address)) {
      return res.status(400).json({ error: "อีเมลไม่ถูกต้อง" });
    }
    if (body.password.length < 8) {
        res.json({ password: "รหัสผ่านห้ามน้อยกว่า 8 ตัว"})
    }

    return res.json(response.rows)
});



app.post('/login', async (req, res) => {
    const { email_address, password } = req.body;
  
    try {
      const result = await client.query('SELECT * FROM users WHERE email_address = $1', [email_address]);
  
      if (result.rows.length === 1) {
        const hashedPassword = result.rows[0].password; 
        if (await argon2.verify(hashedPassword, password)) {
           
            const token = jwt.sign({ userId: result.rows[0].id }, JWT_SECRET, { expiresIn: '1h' });
            return res.json({ token });
          } else {
            return res.status(401).json('Password incorrect');
          }
        } else {
          return res.status(404).json('User not found');
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json('Internal server error');
      }
  });


app.get('/reviews/:id', async (req,res) => {
    const params = req.params;
    const text = 'SELECT * FROM reviews WHERE user_id = $1'
    const values = [params.id]

    const response = await client.query(text, values);
    if (response.rowCount === 0) {
      return res.json({ message: "ไม่พบรีวิวสำหรับผู้ใช้รายนี้" })
  }
    
    res.json(response.rows)
});

app.post('/reviews', authenticateToken, async (req,res) => {
  const body = req.body;

  const restaurants = await client.query(`SELECT * FROM restaurants WHERE id = $1`, [body.restaurant_id]);
  if (restaurants.rowCount === 0) {
    return res.json({ message: "ไม่พบไอดีร้านอาหารดังกล่าว" })
  }

  const text = 'INSERT INTO reviews(user_id, restaurant_id, review_text) VALUES($1, $2, $3)'
  const values = [req.user.userId, body.restaurant_id, body.review_text]
  const response = client.query(text, values)
  
  res.json(response.rows)
});

const port = process.env.NP || 3000;
app.listen(port, ()=> {
    console.log(`listen port ${port}...`)
});

