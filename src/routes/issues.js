var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  //res.send('respond with a resource');
  GetIssuesForReposAsync().then(function(issueList){
     res.json({data: issueList});
    //  res.render('issues', {
    //      title : 'Issues', 
    //      issues: issueList
    //       });
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

var orgId = 'aspnet';
var importantRepos = 
    [        
        'kestrelhttpserver',
        'mvc', 
        'performance', 
        'reliability'
    ];
var importantLabels = 
    [
        'Stress',
        'Perf'
    ];   

github.authenticate({
    type:"token",
    token:""
});


var repoPromise = Promise.defer();

/*
    Iterate through the repos and dump out the issues for each label.
*/
function GetIssuesForReposAsync(res){
       var completedFetchPromise = Promise.defer(); 
       var promises = new Array();
       var completeIssueList = new Array();
        importantLabels.forEach(function(label) {
            importantRepos.forEach(function(repo,i) {
                var issuesPromise = GetIssuesAsync(orgId,repo,label);
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
                    user : element.user.login,
                    labels : labels, 
                    url : element.html_url,
                    number : element.number
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


module.exports = router;