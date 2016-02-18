Pulls list of github issues from a set of repositories configured. 

* Create a `.secret` file which has an access token for yourself. 

``` sh
echo 1234567890 > ./routes/.secret
```

* Check if you can access list of issues.

``` sh
node ./bin/www
curl http://localhost:3000/issues
```

