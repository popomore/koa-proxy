# koa-proxy 

try to rebuild koa-proxy in  koa v2 ,but have some trouble  

and overwrite the test case in koa2

process and problem :

### 5 error
 
### koa-proxy should have option url:
 
 ```
 Error: expected "Content-Type" matching /javascript/, got "text/plain; charset=utf-8"
 //the problem of type  , work well in bowser
 ```
### koa-proxy pass request body
 
 ```
 Uncaught AssertionError: expected '' to be '{"foo":"bar"}'
      + expected - actual

      +"{\"foo\":\"bar\"}"
      -""
//in postman is long time did not response
 ```
### koa-proxy pass parsed request body:
 
 ```
   Error: Parse Error //same problem as well as before case
 ```

### koa-proxy should pass along requestOptions: 

 ```
   Uncaught Error: Error: ETIMEDOUT
 ```
 
### koa-proxy should pass along requestOptions when function:

 ```
   Uncaught Error: Error: ETIMEDOUT
 ```


### change

use async-request install of co-request 


add app.js file to test 
 



## MIT

.


