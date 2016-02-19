var express = require('express');
var router = express.Router();
var config = require('../config.json')
var githubHelper = require('./githubHelper')
/* GET users listing. */

router.get('/', function(req, res){
   
   githubHelper
            .GetIssuesWithLabelsAsync(config.user, config.repos, config.labels)
            .then(function(issueList){
                   res.json({data: issueList}); 
            })
            .catch(function(err){
                    res.send("Error" + err);
            });
});

router.get('/user', function(req, res){
    
    //var users = ['sajayantony','mnltejaswini'];
    var users = config.teamMembers;
    //initially create the map without any key
    var map = {};

    function addValueToList(key, value) {
        //if the list is already created for the "key", then uses it
        //else creates new list for the "key" to store multiple values in it.
        map[key] = map[key] ||  [];
        map[key].push(value);
    }
    
    githubHelper
            .GetIssuesForUserAsync(config.user, config.repos, users)
            .then(function(issueList){
                issueList.forEach(function(issue){
                    addValueToList(issue.assignee,issue);
                });
                
                var data = [];
                Object.keys(map).forEach(function(key) {
                    var val = map[key];
                    data.push({assignee: key, issues : val});
                });
                users.forEach(function(key){
                    
                })
                
                res.json({ data: data}); 
            })
            .catch(function(err){
                    res.send("Error" + err);
            });
});



module.exports = router;