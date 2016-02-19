var express = require('express');
var GitHubApi = require("github");
var promisify = require('promisify-node');

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

var GetIssuesWithLabelsAsync = function (org, repos, labels) {
    var pending = getSecretAsync()
        .then(authenticate)
        .then(function () {
            return getIssuesWithLabelsCoreAsync(org, repos, labels, null);
        });
    return pending;
};

var GetIssuesForUserAsync = function (org, repos, user) {
    var pending = getSecretAsync()
        .then(authenticate)
        .then(function () {
            return getIssuesWithLabelsCoreAsync(org, repos, null, user);
        });
    return pending;
};

var authenticate = function (secret) {
    github.authenticate({
        type: "token",
        token: secret
    });
};

var getIssuesWithLabelsCoreAsync = function (owner, repos, labels, users) {
    var completedFetchPromise = Promise.defer();
    var completeIssueList = new Array();
       
    /* if we aren't filtering by labels then just use a array with one null element */

    if (labels == null) {
        labels = new Array();
        labels.push(null);
    }
    else {
        users = new Array();
        users.push(null);
    }

    var queryList = [];

    users.forEach(function (user) {
        labels.forEach(function (label) {
            repos.forEach(function (repo) {
                var repoOptions = {
                    user: owner,
                    repo: repo
                    // labels :label,
                    // assignee :user
                };

                if (label != null) {
                    repoOptions.labels = label
                }

                if (user != null) {
                    repoOptions.assignee = user;
                }

                queryList.push(repoOptions);
            }, this);
        }, this);
    }, this);

    SerializeGetIssuesAsync(queryList, completeIssueList, completedFetchPromise);
    return completedFetchPromise.promise;
};

function SerializeGetIssuesAsync(queryList, issueAccumulator, completedPromise) {

    if (queryList.length == 0) {        
        completedPromise.resolve(issueAccumulator);
        return;
    }

    var repoOptions = queryList.pop();
    console.log("Items Remaining" + queryList.length + " Current Query"  + JSON.stringify(repoOptions));
   
    GetIssuesAsync(repoOptions)
        .then(function (issues) {
            for (var index = 0; index < issues.length; index++) {
                issueAccumulator.push(issues[index]);
            }
            SerializeGetIssuesAsync(queryList, issueAccumulator, completedPromise);
        }, this)
        .catch(function(err){
            completedPromise.reject(err);
        });
}

function GetIssuesAsync(repoOptions) {
    var issueDefer = Promise.defer();
    var issueList = new Array();
    github.issues.repoIssues(
        repoOptions,
        function (err, res) {
            DrainIssues(err, res, repoOptions.repo, issueDefer, issueList);
        });

    return issueDefer.promise;
}

function DrainIssues(err, res, repo, issueDefer, issueList) {
    if (err != null) {
        console.log(err);
        console.log(JSON.stringify(res))
        issueDefer.reject(err);
        return;
    }

    if (res.length > 0) {
        res.forEach(function (element) {
            var labels = new Array();
            element.labels.forEach(function (issue_label) {
                labels.push(issue_label.name)
            }, this);

            issueList.push({
                repo: repo,
                id: element.id,
                title: element.title,
                assignee: (element.assignee != null ? element.assignee.login : 'unassigned'),
                labels: labels,
                url: element.html_url,
                number: element.number,
                updated_at: element.updated_at,
                milestone: (element.milestone != null ? element.milestone.title : '-')
            });
        });
    }

    if (github.hasNextPage(res)) {
        github.getNextPage(res, function (err, res) {
            DrainIssues(err, res, issueDefer, issueList);
        });
    }
    else {
        issueDefer.resolve(issueList);
    }

}

/* 
 Read the oauth token from .secret
*/
var getSecretAsync = promisify(function (callback) {
    var fs = require('fs')
    var path = require('path');
    var filePath = path.join(__dirname, '.secret');
    fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) {
            callback(err, null)
            console.log(err);
            return;
        }
        callback(null, data);
    });
});

module.exports.GetIssuesWithLabelsAsync = GetIssuesWithLabelsAsync
module.exports.GetIssuesForUserAsync = GetIssuesForUserAsync