const express = require('express');
const mssql = require('mssql');
const bodyparser = require('body-parser');
const app = express();
const config = require('config');

app.use(bodyparser.json());

app.use(function(req,res,next){
    res.header("Access-Control-Allow-Origin","http://localhost:3000");
    res.header("Access-Control-Allow-Methods","GET,POST,PUT,OPTIONS,HEAD");
    res.header("Access-Control-Allow-Headers","Origin,X-Requested-with,contentType,Content-Type,Accept,Authorization");
    next();
})

const server = app.listen(process.env.port|| 4000,function(){
    var port = server.address().port;
    console.log("Now App is running on port",port);
})

console.log(app.get("env"));

console.log(`
User: ${config.get("database.user")}
Server: ${config.get("database.host")}
Password: ${config.get("database.password")}
`)

const dbconfig = {
    user : config.get("database.user"),
    password : config.get("database.password"),
    server : config.get("database.host"),
    //port: 1433,
    database : config.get("database.name")
}

var Agent = require('sqlagent/sqlserver').connect(dbconfig);
var sql = new Agent();

const executequery = function(res,query){
    mssql.close();
    mssql.connect(dbconfig,function(error)
    {   
        if(error){
            console.log("Error: while connecting database");
        }
        else
        {
            var request = new mssql.Request();
            Promise.all([
            request.query(query)
            ])
            .then(function(data){
                res.send(data);
            }) 
    };
    })
}

app.get("/Get_catalog_records",function(req,res){
     let catalog_id = req.query.catalog_id;
     let page_size = req.query.page_size;
     let page = req.query.page;
   
    const request = new mssql.Request();
    request.input("catalogid",mssql.Int,catalog_id);
    request.input("pagesize",mssql.NVarChar,page_size);
    request.input("page",mssql.NVarChar,page);
    request.execute("USP_GetQC_Source_CombinedRecord",function(err,recordsets,returnValue){
        res.send(recordsets);
    });
})

app.get("/CatalogDetails",function(req,res)
{
    const query = "select * from catalog_details";
    executequery(res,query);
})

app.get('/GetQC_Pivot',function(req,res){
    let catalog_id = req.query.catalog_id;
    const request = new mssql.Request();
    request.input("catalogid",mssql.Int,catalog_id);
    request.execute("USP_Get_Pivot_Record",function(err,recordsets,returnValue){
        res.send(recordsets);
    });
})

app.get('/GetQC_Allocated_CatIds', function(req, res, next) {
    const query = "select * from catalog_details where TaskStatus = 'Allocated_To_QC' order by CatalogID desc";
    executequery(res,query);
});

app.post('/Post_Updated_QC_Data',function(req,res)
{
         let values = req.body.updated_records;
         let cat_id = req.body.cat_id.value;
         _.each(values, function(item) {
            sql.update('user1', '['+cat_id+'_output]').make(function(builder) {
                builder.set(item);
                builder.where('Retailer_Item_ID', item.Retailer_Item_ID);
            });
         })
         sql.exec(function(err, response) {
            if(err){
                res.send(err);
            }
            else
            {
                console.log("response",response.user1);
            }
         });
         res.send("Updated Successfully");
});

app.get('/Get_Allocated_Users', function(req,res){
    let catalog_id = req.query.catalogId;
    const request = new mssql.Request();
    request.input("catalogid",mssql.Int,catalog_id);
    request.execute("USP_Get_Allocated_Users",function(err,recordsets,returnValue){
        res.send(recordsets);
    });
})

app.post('/ReturnWork_To_Agent',function(req,res){
    let catid = req.body.cat_id.value;
    let value = req.body.user_agent.value;
    _.each(value, function(item) {
        sql.update('user1', "["+catid+"_output]").make(function(builder) {
            builder.where('User_Id', value);
            builder.where('ProcessStatus', 2);
            builder.set('ProcessStatus', 1);
        });
    })
    sql.exec(function(err, response) {
        console.log("error",err);
    });
    res.send("Success");
})

app.get('/GetFilterValues',function(req,res){
    console.log(req.query.catalogid);
    const catalogid = req.query.catalogid.value;
    const request = new mssql.Request();
    request.input("catalogid",mssql.Int,catalogid);
    request.execute("USP_GetQC_Filter_Values",function(err,recordsets,returnValue){
        if(err) 
        {
            console.log("error",err);
            res.send(err);
        }
        else
        {
            console.log(recordsets);
            res.send(recordsets);
        }
    })
})
