'use strict';
console.log('loading server...');

//import express
let express = require('express');
let logger = require('morgan');
let compression = require('compression');
let favicon = require('serve-favicon');
let bodyParser = require('body-parser');
let fs = require('fs');
let app = express();

const WEB = `${__dirname}/web`;
// const PATH = __dirname.slice(0, __dirname.lastIndexOf('/'));
const PATH = __dirname;
console.log(PATH);
let PORT = process.env.PORT;

//Add middleware
app.use(logger('dev'));
app.use(compression());
app.use(favicon(`${WEB}/favicon.jpg`));
app.use(express.static(`${WEB}`));
// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json 
app.use(bodyParser.json());


//unit tests
app.get(`/unit-test.html`, function(req, res){
    res.status(200).sendFile(`${PATH}/unit-test.html`);
});
//Create
app.post(`/api/v1/dogs`, function(req, res) {
    //get list of dog files
    // let files = fs.readdirSync(`${PATH}/dogs`);
    fs.readdir(`${PATH}/dogs`, (err, files) => {
        if(err){
            res.status(500).send(err);
        }else{
            let filename;
            let dog;
            let fileNumber;
            let id;
            let fileNumbers = [];
            
            if(req.body.id){
                id = parseInt(req.body.id, 10);
            }else{
                //iterate through the files
                //pull id numbers off the file name
                //add id number to a list
                for(let file of files){
                    fileNumber = parseInt(file.split('.')[1], 10);
                    fileNumbers.push(fileNumber);
                }
                //sort the list in ascending order
                fileNumbers.sort(function(a, b){return a - b});
                //get the last id;
                id = fileNumbers.pop();
                //add 1 to the last id
                id += 1;
                
            }
            //create a filename with new id
            filename = `dogs.${id}.json`;
            //Get the dog object from the request
            dog = req.body;
            //Add the id to the dog object
            dog.id = id;
            //save the photo uploaded
            if(dog.photo == ""){
                dog.photo = 'dog-photos/default_dog_image.png';
            }
            
            // Write the json object to the filesytem
            fs.writeFile(`${PATH}/dogs/${filename}`, JSON.stringify(dog), (err) => {
                if(err) {
                    res.status(500).send(err);   
                }
                else{
                    
                    console.log(`${filename} successfully saved`); 
                    res.status(201).send(dog);
                }
            });
        }
    });
});

//Read
app.get(`/api/v1/dogs/:id.json`, function(req, res) {
    console.log(`id = ${req.params.id}`);
    let id = req.params.id;
    let filename = `${PATH}/dogs/dogs.${id}.json`;
    fs.readFile(filename, function(err, data){
        if(err){
            //if file path does not exist send a 404 not found
            if(err.code == 'ENOENT'){
                res.status(404).send('File not found');
            }else{
                res.status(500).send(err);    
            }
        }else{
            console.log(`Read ${filename.split('/').pop()}`);
            res.status(200).send(data);
        }
    });
});

// //Update
app.put(`/api/v1/dogs/:id.json`, function(req, res) {
    let id = req.params.id;
    //Get the dog file with matched id
    let filename = `${PATH}/dogs/dogs.${id}.json`;
    //TODO (alternative way) directly open the file and override the contents with the new contents of dog
    //delete the old dog
    fs.unlink(filename, (err) => {
        if (err){
            res.status(500).send(err);
        } else {
            let dog = req.body;
            fs.writeFile(filename, JSON.stringify(dog), (err2) =>{
                if(err2) {
                    res.status(500).send(err2);
                }else{
                    console.log(`Successfully updated`);
                    res.status(200).send(dog);
                } 
            });
        }
    });
});

//Delete
app.delete('/api/v1/dogs/:id.json', function(req, res) {
    console.log(`id = ${req.params.id}`);
    let id = req.params.id;
    let filePath = `${PATH}/dogs/dogs.${id}.json`;
    //asynchronous method to delete the file if no error occurs
    fs.unlink(filePath, function(err){
        if(err){
            //if file path does not exist send a 404 not found
            if(err.code == 'ENOENT'){
                res.status(404).send('File not found');
            }else{
                res.status(500).send(err);
            }
        }else{
            console.log(`Deleted ${filePath.split('/').pop()}`);
            res.sendStatus(204);
        }
    });
});

//List
app.get('/api/v1/dogs.json', function(req, res){
    //get filename of dog list in file system
    let dogs = [];
    let idNumbers = [];
    let path = `${PATH}/dogs`;
    fs.readdir(path, function(err, files){
       if(err){
           res.status(500).send(err);
       }else{
            for(let file of files){
                let id = parseInt(file.split('.')[1], 10);
                idNumbers.push(id);
            }
            res.status(200).send(idNumbers);
       }
    });
});

app.get('*', function(req, res){
    res.status(404).sendFile(`${WEB}/404.html`);
});

let server = app.listen(PORT, function(){
    console.log(`listening on port ${PORT}`);
});

let io = require('socket.io')(server);
//socket io listeners
io.on('connection', function (socket) {
  console.log('a user connected');
  socket.on('user update', function(data){
    io.emit('user update', data); 
  });
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

function gracefulShutdown(){
    console.log(`\nStarting shutdown...`);
    server.close(function(){
        console.log('Shutdown complete.');
    });
}
//passing a callback of gracefulShutdown for SIGINT
process.once('SIGINT', gracefulShutdown);

//passing a callback of gracefulShutdown for SIGTERM
process.on('SIGTERM', gracefulShutdown);
