var express = require('express');
var router = express.Router();
var config = require('../config.json')
/* GET users listing. */
router.get('/', function(req, res, next) {
    
  getSecretAsync().then(function(secret){
      github.authenticate({
            type:"token",
            token:secret
        });       
    GetIssuesForReposAsync().then(function(issueList){
     res.json({data: issueList});
    });
  }).catch(function(err){
     res.send("Error getting secret."); 
  });
});

var GitHubApi = require("github");

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    debug: false,
    protocol: "https",
    host: "api.github.com", // should be api.github.com for GitHub
    pathPrefix: "", // for some GHEs; none for GitHub
    timeout: 5000,
    headers: {
        "user-agent": "Sample-App" // GitHub is happy with a unique user agent
    }
});

/*
    Iterate through the repos and dump out the issues for each label.
*/
function GetIssuesForReposAsync(res){
       var completedFetchPromise = Promise.defer(); 
       var promises = new Array();
       var completeIssueList = new Array();
        config.labels.forEach(function(label) {
            config.repos.forEach(function(repo,i) {
                var issuesPromise = GetIssuesAsync(config.user,repo,label);
                var pending = Promise.defer();
                promises.push(pending.promise)
                issuesPromise.then(function(issues)
                {                   
                    for (var index = 0; index < issues.length; index++) {
                        console.log(JSON.stringify(issues[index]))
                        //res.json(issues);
                        completeIssueList.push(issues[index]);                        
                    }
                    pending.resolve();                                   
                },this);      
       }, this);
   }, this);
      
   Promise.all(promises).then(function() {        
       completedFetchPromise.resolve(completeIssueList)
   });
   
   return completedFetchPromise.promise;     
};


function GetIssuesAsync(owner, repo, label) {
    var issueDefer  = Promise.defer();
    var issueList = new Array();
    github.issues.repoIssues(
            {
                user:owner,
                repo:repo,
                labels :label
            },
            function(err, res){
                DrainIssues(err,res, repo, issueDefer, issueList);
            });
            
        return issueDefer.promise;                                     
    }
    
function DrainIssues(err, res,repo, issueDefer, issueList)
{
    if(err != null)
    {
        console.log(err);
        console.log(JSON.stringify(res))  
        issueDefer.resolve(err);          
    }
    else
    {                
        if(res.length > 0)
        {
            res.forEach(function(element) {
                var labels = new Array();                        
                element.labels.forEach(function(issue_label) {
                    labels.push(issue_label.name)
                }, this);
                
                issueList.push({
                    repo: repo,
                    id:element.id,
                    title : element.title,
                    assignee : (element.assignee != null ? element.assignee.login : element.user.login),
                    labels : labels, 
                    url : element.html_url,
                    number : element.number,
                    updated_at: element.updated_at,
                    milestone : (element.milestone != null ? element.milestone.title : '-')
                });
            });
        }
        
        if(github.hasNextPage(res))
        {
            github.getNextPage(res, function(err, res){
                DrainIssues(err,res, issueDefer, issueList);
            });
        }
        else
        {
            issueDefer.resolve(issueList);  
        }                                 
    }            
}    

/* 
 Read the oauth token from .secret
*/
function getSecretAsync() {
    var fs = require('fs')
    var path = require('path');
    var readDefer = Promise.defer();
    var filePath = path.join(__dirname, '.secret');
    fs.readFile(filePath, 'utf8', function (err,data) {
    if (err) {
        readDefer.reject(err);
        return console.log(err);
    }
    //console.log(data);
        readDefer.resolve(data);
    });
    
    return readDefer.promise;
}


module.exports = router;