// database stuff
const MongoClient = require('mongodb').MongoClient;
let ObjectId = require('mongodb').ObjectID;
const uri = "mongodb+srv://liuantonliu:ep84x82k@shippie-iuyos.mongodb.net/shippie?retryWrites=true&w=majority"
const client = new MongoClient(uri, {useUnifiedTopology: true});
const dbName = "Shippie"
//express stuff
const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 8000;

const { EJSON } = require('bson');//TODO: is Ejson really needed? change search functions if no

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public')); //image serving

let db;
let col;

//TODO: write catch statements
// ********** MISC FUNCTIONS *************
// open database
async function start(){
    await client.connect();
    console.log("SUCCESS: Connected correctly to server");
    db = client.db(dbName);
    // await client.close(); NOT NEEDED https://stackoverflow.com/questions/52067945/when-to-close-a-mongodb-connection
}

//call this to create unique id. Is installing npm package better? https://www.npmjs.com/package/uuid
function create_UUID(){
    let dt = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

//find sum of all user products in a group
const findSum = (group) => {
    let sum = 0;
    for (let order of group.orders) {
        for (let item of order.items) {
            // console.log(item);
            sum += parseFloat(item.price);
        }
    }
    return sum;
}

// SEND USER TO HOME.HTML
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/home.html');
    console.log('SUCCESS: User is at homepage');
});

// ********** USER LOGIN AND REGISTER FUNCTIONS *************
// USER LOGIN
app.post('/login', async (req, res) => { //ASYNC BECAUSE NEEDS ALLUSERS TO COME BACK WITH DATA
    const userLogin = req.body.username;
    const passLogin = req.body.password;

    col = db.collection("Users");
    cred = await col.findOne({"username":userLogin})
    // console.log(cred['password'])
    if (cred["password"] == passLogin){
        res.sendFile(__dirname + '/group-list.html');
        res.redirect("http://localhost:8000/groups/"+ userLogin); //so that the url contains username
        console.log("SUCCESS: User logged in to Shippie");                
        return;
    }
    res.send(`User Not Found; Username/Password Incorrect`);
});

// SEND USER TO GROUP-LIST.HTML (only using for adding username in url)
app.get('/groups/:username', async (req, res) => {
    // const user = req.params.username;
    // console.log(user);
    // let users = await allUsers();
    // console.log(users);
    // for (let i of users) {
    //     if (i.username === user) {
    //         // if (i.power === "admin"){
    //         //     res.sendFile(__dirname + '/group-list.html');

    //         // }
    //         // else {
    //             res.sendFile(__dirname + '/group-list.html');
    //         // }

    //         return;
           
    //     }
    // }
    res.sendFile(__dirname + '/group-list.html');
    return;
});

// VERIFY USERNAME FOR SIGN UP
app.post('/verify/:username', async (req, res) => {
    const userVerify = req.params.username;
    // console.log(userVerify);
    col = db.collection("Users");

    let p = await col.find({"username":userVerify}).toArray(); //https://stackoverflow.com/questions/24403732/how-to-check-if-array-is-empty-or-does-not-exist
    // console.log(p);
    if (!Array.isArray(p) || !p.length){
        res.send("success");
    }else{
        res.send("fail");
    }
    
});

// VERIFY USERNAME FOR LOG IN
app.post('/verify/:username/:password', async (req, res) => {
    const userVerify = req.params.username;
    const passVerify = req.params.password;

    col = db.collection("Users");
    let p = await col.find({"username":userVerify}).toArray(); //https://stackoverflow.com/questions/24403732/how-to-check-if-array-is-empty-or-does-not-exist
    // console.log(p);
    if (!Array.isArray(p) || (p.length!==1 & p.length!==0)){
        res.send("fail");
    }else if (p.length == 0){
        res.send("incorrect username");
    }else if (p[0].password !== passVerify){
        res.send("incorrect password");
    }else{
        res.send("success");
    }
    
});

// SIGN UP
app.post('/user', async (req, res) => {
    console.log("hit");
    const userCreate = req.body.username;
    const passCreate = req.body.password;
    // output the user to the console for debugging
    // console.log(userCreate);
    // console.log(passCreate);

    // database stuff
    col = db.collection("Users")
    let users = {
        "username": userCreate,
        "password": passCreate
    };
    console.log(users);
    let p = await col.insertOne(users);
    res.redirect("http://localhost:8000/"); //is this needed?
    console.log('SUCCESS: User is added to the database');
});

// ********** GROUP FUNCTIONS *************
// DONE: Adds a group to database (without data needed) not being used
app.post('/group/create_empty/:username', async (req, res) => {
    const username = req.params.username;

    // console.log('called2');
    //create group
    col = db.collection("Groups");
    let group = {
        "admin_name": username,
        "orders": [{
            "username": username,
            "items": []
        }]
    };
    
    // console.log(group);
    let p = await col.insertOne(group);

    res.redirect("http://localhost:8000/groups/"+ username);
    console.log('SUCCESS: Group is added to the database');
});

// DONE: Adds a group to database
app.post('/group/create/:username', async (req, res) => {
    const username = req.params.username;
    const pickup_location = req.body.pickup_location;
    const pickup_date = req.body.pickup_date;
    const contact = req.body.contact;
    const goal_amount = req.body.goal_amount;
    const website = req.body.website;
    const group_name = req.body.group_name;
    //create group
    col = db.collection("Groups");
    let group = {
        "admin_name": username,
        "group_name": group_name,
        "pickup_location": pickup_location,
        "pickup_date": pickup_date,
        "contact": contact,
        "goal_amount": goal_amount,
        "website": website,
        "orders": [{
            "username": username,
            "items": []
        }]
    };
    // console.log(group);
    let p = await col.insertOne(group);
    res.redirect("http://localhost:8000/groups/"+ username);
    console.log('SUCCESS: Group is added to the database');
});

//DONE: find groups user is normal in
app.get('/group/findnormal/:user', async (req, res) => {
    const username = req.params.user;
    try {
        // Use the collection "Groups"
        const col = db.collection("Groups");
        // Get all objects in Groups collection
        // const groups = await col.find().toArray();
        const groups = await col.find({"orders.username":username, "admin_name": {$ne:username}}).toArray(); //https://stackoverflow.com/questions/20803512/mongo-find-documents-that-do-not-contain-a-given-value-using-not
        const str2 = EJSON.stringify(groups);
        const str1 = '{"groups":';
        const str3 = "}";
        const groupsString = str1.concat(str2, str3);
        // console.log(groupsString);
        const groupsJSON = EJSON.parse(groupsString);
        // Print to the console
        // console.log('NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN');
        // console.log(groupsJSON["groups"]);
        res.json(groupsJSON["groups"]);
    } catch (err) {
         console.log(err.stack);
    }
    finally {
        console.log("SUCCESS: All group normal info extracted")
    }
});

//DONE: find groups that user is admin in
app.get('/group/findadmin/:user', async (req, res) => {
    const username = req.params.user;
    try {
        // Use the collection "Groups"
        const col = db.collection("Groups");
        // Get all objects in Groups collection
        const groups = await col.find({"admin_name":username}).toArray();
        const str2 = EJSON.stringify(groups);
        const str1 = '{"groups":';
        const str3 = "}";
        const groupsString = str1.concat(str2, str3);
        // console.log(groupsString);
        const groupsJSON = EJSON.parse(groupsString);
        // Print to the console
        // console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        // console.log(groupsJSON["groups"]);
        res.json(groupsJSON["groups"]);
    } catch (err) {
         console.log(err.stack);
    }
    finally {
        console.log("SUCCESS: All group admin info extracted")
    }
});

//DONE: find groups that user is not in
app.get('/group/findavail/:user', async (req, res) => {
    const username = req.params.user;
    try {
        // Use the collection "Groups"
        const col = db.collection("Groups");
        // Get all objects in Groups collection
        const groups = await col.find({"orders.username":{$ne:username}, "admin_name": {$ne:username}}).toArray(); 
        const str2 = EJSON.stringify(groups);
        const str1 = '{"groups":';
        const str3 = "}";
        const groupsString = str1.concat(str2, str3);
        // console.log(groupsString);
        const groupsJSON = EJSON.parse(groupsString);
        // Print to the console
        // console.log('AAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
        // console.log(groupsJSON["groups"]);
        res.json(groupsJSON["groups"]);
    } catch (err) {
         console.log(err.stack);
    }
    finally {
        console.log("SUCCESS: All group avail info extracted")
    }
});

//DONE: add user to group
app.post('/group/:group_id/:user', async (req, res) => {
    // reading id from the URL
    const group_id = req.params.group_id;
    const username = req.params.user;
    // console.log(id);
    let push_user = {
        "username": username,
        "items": []
    }
    col = db.collection("Groups");
    const p = await col.updateOne(
        {"_id": ObjectId(group_id)},
        {$push: {'orders': push_user}}
    );
    res.redirect("http://localhost:8000/groups/"+ username);
    console.log('SUCCESS: User is added to group');
});

//DONE: delete user from group
app.delete('/group/:group_id/:user/remove', async (req, res) => {
    // reading id from the URL
    const id = req.params.group_id;
    const username = req.params.user;
    // console.log(id);
    col = db.collection("Groups");
    const p = await col.updateOne(
        {"_id": ObjectId(id), "orders":{$elemMatch: {"username": username}}},
        {$pull: {'orders': {"username":username}}}
    );
    res.redirect("http://localhost:8000/groups/"+ username);
    console.log('SUCCESS: User is removed from group');
});

// DONE: Deletes a group
app.delete('/group/:group_id/:user', async (req, res) => {
    // reading id from the URL
    const id = req.params.group_id;
    const username = req.params.user;
    // console.log(id);
    col = db.collection("Groups");
    let p = await col.deleteOne( { "_id" : ObjectId(id) } );
    
    res.redirect("http://localhost:8000/groups/"+ username);
    console.log('SUCCESS: Group is deleted from the database');
});

// SEND USER TO BOOK-LIST.HTML
app.get('/groups/:username/:group_id/user', (req, res) => {
    res.sendFile(__dirname + '/book-list.html');
});

// ********** CONNECTING GROUP TO ORDERS FUNCTIONS *************
// RETURN ALL ITEMS IN A GROUP FROM A USER
app.get('/groups/:username/:group_id', async (req, res) => {
    const username = req.params.username;
    const group_id = req.params.group_id;
    
    let data;
    const col = db.collection("Groups");
    // Get all objects in Groups collection
    const group = await col.findOne({ "_id" : ObjectId(group_id) });
    data = {
        "admin_name": group.admin_name,
        "group_name": group.group_name,
        "pickup_location": group.pickup_location,
        "pickup_date": group.pickup_date,
        "contact": group.contact,
        "goal_amount": group.goal_amount,
        "website": group.website,
        "sum": findSum(group)
    }
    //return different things if admin or no
    if (group.admin_name == username){
        data["info"] = group.orders;
    }else{
        for (let order of group.orders){
            if (order.username == username){
                data["info"] = order;
            }
        }  
    }
    // console.log(data);
    res.json(data);
    console.log("SUCCESS: Found group details")
});

// ADD ITEM TO GROUP
// https://stackoverflow.com/questions/13987365/how-to-insert-an-element-to-mongodb-internal-list
app.post('/groups/:username/:group_id/user/add_item', async (req, res) => {
    const url = req.body.url;
    const price = req.body.price;
    const username = req.params.username;
    const group_id = req.params.group_id;
    // console.log(username,group_id);

    const push_item = {
        "id": create_UUID(),
        "url": url,
        "price": price,
    };
    // console.log(push_item);

    //add item in database
    const col = db.collection("Groups");
    const p = await col.updateOne(
        {"_id": ObjectId(group_id), "orders":{$elemMatch: {"username": username}}}, //TODO: can i do just "orders.username":username ?
        {$push: {'orders.$.items': push_item}}
    );

    res.redirect("http://localhost:8000/groups/"+ username +"/"+ group_id +"/user");
    console.log('SUCCESS: Item is added to the database');
})

//DELETE ITEM FROM GROUP
// https://docs.mongodb.com/manual/reference/operator/update/pull/
app.delete('/groups/:username/:group_id/user/:item_id', async (req, res) => {
    // // reading id from URL
    const username = req.params.username;
    const group_id = req.params.group_id;
    const item_id = req.params.item_id;
    console.log(username,group_id,item_id);
    //remove item in database
    const col = db.collection("Groups");
    const p = await col.updateOne(
        {"_id": ObjectId(group_id), "orders":{$elemMatch: {"username": username}}},
        {$pull: {'orders.$.items': {"id":item_id}}}
    );
    // const found = await col.findOne(
    //     {"_id": ObjectId(group_id), "orders":{$elemMatch: {"username": username}}}
    // )
    // console.log(found);

    res.redirect("http://localhost:8000/groups/"+ username +"/"+ group_id +"/user");
    console.log('SUCCESS: Item is removed from the database');
    
});

//edit item in group
app.post('/groups/:username/:group_id/user/:item_id/:orderedBy/edit_item', async (req, res) => {
    const website = req.body.website;
    const price = req.body.price;
    const item_id = req.params.item_id;
    const username = req.params.username;
    const group_id = req.params.group_id;
    const orderedBy = req.params.orderedBy;
    // console.log(username,group_id,website,price,item_id,orderedBy);

    //edit item in database
    const col = db.collection("Groups");
    //find index of item
    let index = -1;
    const group = await col.findOne({"_id": ObjectId(group_id)});
    for (let i = 0; i < group.orders.length; i++) {
        let order = group.orders[i];     
        if (order.username == orderedBy) {
            for (let j = 0; j < order.items.length; j++) {
                let item = order.items[j];
                if (item.id == item_id){
                    index = j;
                }
            }
        }
    }    
    //edit item
    const setString = "orders.$.items." + index;
    const set_item = {
        "id": item_id,
        "url": website,
        "price": price,
    };
    const setJson = {[setString] : set_item};
    // console.log(setJson);
    const p = await col.updateOne({
            "_id": ObjectId(group_id), 
            "orders.username": orderedBy,
            "orders.items.id":item_id
        },                            
        {$set: setJson}
    );

    res.redirect("http://localhost:8000/groups/"+ username +"/"+ group_id +"/user");
    console.log('SUCCESS: Item is edited in the database');
})

//edit group info
app.post('/groups/:username/:group_id/user/edit_group', async (req, res) => {
    const location = req.body.location;
    const date = req.body.date;
    const name = req.body.name;
    const contact = req.body.contact;
    const goal = req.body.goal;
    const group_id= req.params.group_id;
    const username = req.params.username;
    console.log(username,group_id,location,date,name,contact,goal);

    const col = db.collection("Groups");
    const p = await col.updateOne({
            "_id": ObjectId(group_id)
        },                            
        {$set: 
            {
                "pickup_location": location,
                "pickup_date": date,
                "group_name": name,
                "contact": contact,
                "goal_amount": goal
            }  
        }
    );

    res.redirect("http://localhost:8000/groups/"+ username +"/"+ group_id +"/user");
    console.log('SUCCESS: Group info is edited in the database');
})

app.listen(port, () => console.log(`SUCCESS: Shippie is listening on port ${port}!`));

start()