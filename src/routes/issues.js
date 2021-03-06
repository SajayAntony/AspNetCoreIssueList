var express = require('express');
var router = express.Router();
var config = require('../config.json')
var githubHelper = require('./githubHelper')
var cache = require('./cacheHelper')
/* GET users listing. */

router.get('/', function (req, res) {
    var cacheKey = 'HomePage';
    cache.getKeyAsync(cacheKey)
        .then(function (cachedValue) {
            if (cachedValue == null) {
                var repos = config.repos;
                githubHelper.GetIssuesWithLabelsAsync(config.user, repos, config.labels)
                    .then(function (issueList) {
                        cache.putKeyAsync(cacheKey, issueList);
                        res.json({ data: issueList });
                    })
                    .catch(function (err) {
                        res.send("Error" + err);
                    });
            }
            else {
                res.json({ data: cachedValue });
            }
        })
});

router.get('/user', function (req, res) {
    var cacheKey = 'teamList';
    cache.getKeyAsync(cacheKey)
        .then(function (cachedValue) {
            if (cachedValue == null) {
                var users = config.teamMembers;
                var repos = config.repos;
            
                // Uncomment the following for debugging.
                // users = ['sajayantony','mnltejaswini'];
                // repos = ['Performance', 'Coherence-Signed'];            
            
                //initially create the map without any key
                var map ={}

                function addValueToList(key, value) {
                    //if the list is already created for the "key", then uses it
                    //else creates new list for the "key" to store multiple values in it.
                    map[key] = map[key] || [];
                    if(value.type == 'pr'){
                        map[key].prs = map[key].prs || []
                        map[key].prs.push(value)       
                    }
                    else{
                        map[key].issues = map[key].issues || []
                        map[key].issues.push(value)       
                        
                    }
                    map[key].push(value);
                }

                githubHelper
                    .GetIssuesForUserAsync(config.user, repos, users)
                    .then(function (issueList) {
                        issueList.forEach(function (issue) {
                            var assignee = issue.type == "pr" ? issue.author : issue.assignee;
                            addValueToList(assignee, issue);                            
                        });

                        var data = [];
                        Object.keys(map).forEach(function (key) {
                            var value = map[key];
                            data.push(
                                { 
                                    assignee: key, 
                                    prs: value.prs,
                                    issues: value.issues });
                        });
                        
                        users.forEach(function (key) {
                        })
                        cache.putKeyAsync(cacheKey, data);
                        res.json({ data: data });
                    })
                    .catch(function (err) {
                        res.send("Error" + err);
                    });
            }
            else {
                res.json({ data: cachedValue });
            }
        })
});



module.exports = router;