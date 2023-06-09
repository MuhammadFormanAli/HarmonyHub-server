const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())



const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization

  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' })
  }

  const token = authorization.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.shgmdrc.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});





async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const usersCollection = client.db('summerCampDb').collection('users');
    const classCollection = client.db('summerCampDb').collection('classes');
    const cartsCollection = client.db('summerCampDb').collection('carts');


    app.post('/jwt', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' })
      res.send({ token })
    })


    // route for add users in database
    app.post('/users', async (req, res) => {
      const user = req.body;
      console.log(user)
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    // route for get all users 
    app.get('/users', verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result);
    })


    //route for get user role
    app.get('/user/:email',verifyJWT, async(req,res)=>{
      const userEmail = req.params.email 
      console.log(userEmail)
      const query = { email: userEmail };
      const options = {
        projection: { _id: 0 , role: 1 },
      };
      const result = await usersCollection.findOne(query, options)
      res.send(result)

    })

    // app.get('/life',(req,res)=>{
    //   console.log('life is beautiful')
    //   res.send("life")
    // })


    //api for update user role
    app.put('/users/:id', async (req, res) => {
      const id = req.params.id
      const newRole = req.body.updatedRole
      console.log(id, newRole)
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateRole = {
        $set: {
          role: newRole
        }
      }

      const result = await usersCollection.updateOne(filter, updateRole, options)
      res.send(result)
    })


    //api for get cart data
    app.get('/carts', verifyJWT, async (req, res) => {
      const email = req.query.email
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'forbidden access' })
      }

      const query = { studentEmail: email }
      const result = await cartsCollection.find(query).toArray()
      res.send(result);
    });

    //api for add items in cart
    app.post('/carts', async (req, res) => {
      const cart = req.body;
      console.log(cart)
      const query = { studentEmail: cart.studentEmail, courseId: cart.courseId }
      const existCourse = await cartsCollection.findOne(query);

      if (existCourse) {
        return res.send({ message: 'already added' })
      }
      const result = await cartsCollection.insertOne(cart);
      res.send(result);
    });



    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result);
    })



    //api for update class status
    app.put('/classes/:id', async (req, res) => {
      const id = req.params.id
      const newStatus = req.body.updatedStatus
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateStatus = {
        $set: {
          status: newStatus
        }
      }

      const result = await classCollection.updateOne(filter, updateStatus, options)
      res.send(result)
    })




    // route for get top classes
    app.get('/topclasses', async (req, res) => {
      const sort = { enrolledStudents: -1 }
      const result = await classCollection.find().sort(sort).limit(6).toArray()
      res.send(result);

    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Life is running')
})
app.listen(port, () => {
  console.log(`life is running on port:${port}`)
})