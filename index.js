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
    const testCollection = client.db('summerCampDb').collection('test');


    app.post('/jwt', (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '12h' })
      res.send({ token })
    })


    // route for add users in database
    app.post('/users', async (req, res) => {
      const user = req.body.saveUser;
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
    app.get('/user/:email', verifyJWT, async (req, res) => {
      const userEmail = req.params.email
      console.log(userEmail)
      const query = { email: userEmail };
      const options = {
        projection: { _id: 0, role: 1 },
      };
      const result = await usersCollection.findOne(query, options)
      res.send(result)

    })


    //api for update user role
    app.put('/users/:id',verifyJWT, async (req, res) => {
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



    //card related api

    //api for get cart data
    app.get('/carts',verifyJWT, async (req, res) => {
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
    app.post('/carts', verifyJWT, async (req, res) => {
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



        //api for update cartItem pay status
        app.put('/cartItem/:id', async (req, res) => {
          const id = req.params.id
          const newStatus = req.body.updatedStatus
          const filter = { _id: new ObjectId(id) }
          const options = { upsert: true }
    
          const updateStatus = {
            $set: {
              payStatus: newStatus
            }
          }
          const result = await cartsCollection.updateOne(filter, updateStatus, options)
          res.send(result)
        })


        //delete from cart
        app.delete('/cart/delete/:id', async(req, res)=>{
          const id = req.params.id 
          const query = {_id: new ObjectId(id)}
          const result = await cartsCollection.deleteOne(query)
          res.send(result)

        })












    //class related routes
    //route for get classes data
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray()
      res.send(result);
    })

    // get one class
    app.get('/classes/:id',  async (req, res) => {
      const id = req.params.id
      console.log(id)
      const query = { _id: new ObjectId(id) }
      const result = await classCollection.findOne(query)
      res.send(result)
    })


    //route for get instructors classes by their email
    app.get('/classes/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      const query = { instructorEmail: email }
      const result = await classCollection.find(query).toArray()
      res.send(result)
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



    //route for send feedback
    app.put('/classes/feedback/:id', verifyJWT, async (req, res) => {
      const id = req.params.id
      const feedback = req.body.feedback
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }

      const updateStatus = {
        $set: {
          feedback: feedback
          // feedback: feedback
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


    //route for add classes
    app.post('/classes', verifyJWT, async (req, res) => {
      const course = req.body.course;
      console.log(course)
      const query = {
        instructorEmail: course.instructorEmail,
        className: course.className, img: course.img,
        status: course.status, price: course.price, availableSeats: course.availableSeats
      }
      const existCourse = await classCollection.findOne(query);

      if (existCourse) {
        return res.send({ message: 'already added' })
      }
      const result = await classCollection.insertOne(course);
      res.send(result);
    });


    //test apis id:6484449938a3ac3414539216

    app.post('/test/:id', async (req, res) => {
      const id = req.params.id
      let newName 
      let newEmail 

      if (req.query.email) {
       newEmail = parseFloat(req.query.email)
      }
      if (req.query.name) {
       newName = req.query.name
      }
      console.log(newEmail,newName)
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updateField = {
        $set: {
          name: newName,
          email: newEmail
        }
      }

      const result = await testCollection.updateOne(filter, updateField, options)
      res.send(result)
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