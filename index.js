const express = require('express')
const app = express()
const cors =require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000

//middleware
app.use(cors())
app.use(express.json())




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

//api for get cart data
    app.get('/carts', async (req, res) => {
      const email = req.query.email
      console.log( 'email', email)

      const query = { studentEmail:email}
      const result = await cartsCollection.find(query).toArray()
      res.send(result);
    });

//api for add items in cart
    app.post('/carts', async (req, res) => {
      const cart = req.body;
      console.log(cart)
      const query = { studentEmail: cart.studentEmail, courseId:cart.courseId }
      const existCourse = await cartsCollection.findOne(query);

      if (existCourse) {
        return res.send({ message: 'already added' })
      }

      const result = await cartsCollection.insertOne(cart);
      res.send(result);
    });


    app.get('/classes', async( req, res) => {
        const result = await classCollection.find().toArray()
        res.send(result);
    })

    //api for update class status
    app.put('/classes/:id',async(req,res)=>{
      const id = req.params.id 
      const newStatus = req.body.updatedStatus
      // console.log(req.body)
      // console.log(id)

      const filter = {_id: new ObjectId(id)}
      const options = { upsert: true }
      const updateStatus = {
        $set: {
          status:newStatus
        }
      }

      const result = await classCollection.updateOne(filter,updateStatus,options)
      res.send(result)

    })




    // route for get top classes
    app.get('/topclasses', async( req, res) => {
        const sort = {enrolledStudents:-1}
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




app.get('/',(req,res)=>{
    res.send('Life is running')
})
app.listen(port,()=>{
    console.log(`life is running on port:${port}`)
})