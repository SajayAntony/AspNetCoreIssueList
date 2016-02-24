var express = require('express');
var GitHubApi = require("github");
var promisify = require('promisify-node');

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    debug: true,
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
            var repoOptions = {
                org: owner,
            };

            if (label != null) {
                repoOptions.q = [
                    '',
                    'user:' + owner,
                    'label:' + label,
                    'state:open'
                ].join('+')           
            }

            if (user != null) {
                repoOptions.q = [
                    '',
                    'user:' + owner,
                    'assignee:' + user,
                    'state:open'
                ].join('+')
            }

            queryList.push(repoOptions);
        }, this);
    }, this);

    var allTasks = new Array();
    for (var index = 0; index < 5; index++) {
        var task = Promise.defer();
        allTasks.push(task.promise);
        SerializeGetIssuesAsync(queryList, completeIssueList, task);
    }

    Promise.all(allTasks).then(function () {
        completedFetchPromise.resolve(completeIssueList)
    }).catch(function (err) {
        completedFetchPromise.reject(err);
    });

    return completedFetchPromise.promise;
};

function SerializeGetIssuesAsync(queryList, issueAccumulator, completedPromise) {

    if (queryList.length == 0) {
        completedPromise.resolve(issueAccumulator);
        return;
    }

    var repoOptions = queryList.pop();
    console.log("Items Remaining" + queryList.length + " Current Query" + JSON.stringify(repoOptions));

    GetIssuesAsync(repoOptions)
        .then(function (issues) {
            for (var index = 0; index < issues.length; index++) {
                issueAccumulator.push(issues[index]);
            }
            SerializeGetIssuesAsync(queryList, issueAccumulator, completedPromise);
        }, this)
        .catch(function (err) {
            completedPromise.reject(err);
        });
}

function GetIssuesAsync(repoOptions) {
    var issueDefer = Promise.defer();
    var issueList = new Array();

    var DrainIssues = function (err, res) {
        if (err != null) {
            console.log(err);
            console.log(JSON.stringify(res))
            issueDefer.reject(err);
            return;
        }

        var items = res;
        if(res.items != null && res.items.length > 0)
        {
            items = res.items;
        }

        if (items.length > 0) {
            for (var index = 0; index < items.length; index++) {
                var element = items[index];
                var labels = new Array();
                element.labels.forEach(function (issue_label) {
                    labels.push(issue_label.name)
                }, this);

                var repoName = element.repository_url.substr(element.repository_url.lastIndexOf("/") + 1);
                issueList.push({
                    repo: repoName,
                    id: element.id,
                    title: element.title,
                    assignee: (element.assignee != null ? element.assignee.login : 'unassigned'),
                    labels: labels,
                    url: element.html_url,
                    number: element.number,
                    updated_at: element.updated_at,
                    milestone: (element.milestone != null ? element.milestone.title : '-')
                });
            }
        }

        if (github.hasNextPage(res)) {
            github.getNextPage(res, function (err, res) {
                DrainIssues(err, res, issueDefer, issueList);
            });
        }
        else {
            issueDefer.resolve(issueList);
        }
    };

    // Kick off the issue retrieval query.
    github.search.issues(
        {
            q: repoOptions.q
        },
        function (err, res) {
            DrainIssues(err, res);
        });
    
    return issueDefer.promise;
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