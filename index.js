/**
 * Created by northka.chen on 2016/12/9.
 */
const queryString  = require('querystring')
const https         = require('https')

const BufferHelper = require('./bufferHelper')

function getRandomInt(min, max) {
    return (Math.random() * (max - min + 1))>>0 + min
}
function getHost(){
    if(Array.isArray(this.host)){
        return this.host[getRandomInt(0, this.host.length - 1)]
    }else{
        return this.host
    }
}
function parseParams ( params){
    if( !params || typeof  params === 'string' ){
        return params || ''
    }else if(params instanceof Array){
        return params.join('&')
    }
    return queryString.stringify( params )
}
module.exports = {
    request: function(reqObj, successCallback, errorCallback, requestListner) {
        if(typeof this.shouldRequest == 'function' && this.shouldRquest.call(this,reqObj,successCallback,errorCallback)){
            return  1
        }
        this.globalFunc.allRequestBefore.call(this,reqObj,successCallback,errorCallback)
        this.requestBefore && typeof this.requestBefore == 'function' && this.requestBefore.call(this,reqObj,successCallback,errorCallback)
        let option = {
                host: getHost.call(this),
                port: this.port,
                path: reqObj.path || this.option.path,
                method: this.option.method,
                rejectUnauthorized : reqObj.rejectUnauthorized === undefined
                                     ? this.option.rejectUnauthorized === undefined ? true : false
                                     : reqObj.rejectUnauthorized,
                pfx                : reqObj.pfx            || this.option.pfx            || null,
                key                : reqObj.key            || this.option.key            || null,
                auth               : reqObj.auth           || this.option.auth           || null,
                passphrase         : reqObj.passphrase     || this.option.passphrase     || null,
                cert               : reqObj.cert           || this.option.cert           || null,
                ciphers            : reqObj.ciphers        || this.option.ciphers        || undefined,
                secureProtocol     : reqObj.secureProtocol || this.option.secureProtocol || undefined,
                servername         : reqObj.servername     || this.option.servername     || undefined,
                headers            : Object.assign({}, this.option.headers, reqObj.headers)
            },
            self = this
        if(this.option.pfx ||  reqObj.pfx){
            Object.assign(option, {

            })
        }

        let query = parseParams(reqObj.params)
        if(option.method.toUpperCase() === 'GET'){
			if(option.path.indexOf('?') < 0){
				option.path += '?' + query
			}else{
				option.path += '&' + query
			}
		}else {
			option.headers[ 'Content-Length' ] = query.length
			option.headers[ 'Content-Type']    = 'application/x-www-form-urlencoded'
		}
        requestListner && requestListner.emit('requestBegin',option)
        let req = https.request( option, (res) => {
            self.waitRequest == 'function' && self.waitRequest.call(self,reqObj,successCallback,errorCallback)
            let bufferHelper = new BufferHelper()
            let timer = setTimeout( function() {
                errorCallback( 'error' )
                requestListner && requestListner.emit('requestTimeout',option)
            }, self.timeout )
            res.on('data', (chunk) =>{
                bufferHelper.concat( chunk )
            })
            res.on('end', () => {

                let buf = bufferHelper.toBuffer()
                requestListner && requestListner.emit('requestEnd',buf)
                let result
                try{
                    if(option.encoding === 'raw'){
                        result = buf
                    }else{
                        if( res.headers['content-type'].indexOf('application/json') >= 0){
                            result = JSON.parse(buf.toString())
                        }else{
                            result = buf.toString()
                        }
                    }
                }catch (e){
                    clearTimeout(timer)
                    typeof self.afterRequest == 'function' && self.afterRequest.call(self,e,buf,reqObj,successCallback,errorCallback)
                    self.globalFunc.allRequestAfter.call(self,e,buf,reqObj,successCallback,errorCallback)
                    errorCallback(e)
                    return
                }
                clearTimeout(timer)

                typeof self.afterRequest == 'function' && self.afterRequest.call(self,null,[result, res.headers[ 'set-cookie']],reqObj,successCallback,errorCallback)
                self.globalFunc.allRequestAfter.call(self,null,[result, res.headers[ 'set-cookie']],reqObj,successCallback,errorCallback)
                successCallback(result, res.headers[ 'set-cookie'])
            })
        })
        option.method === 'GET' || req.write( query )
        req.on( 'error', (e) => {
            errorCallback(e)
        })
        req.end()
    },
    parseReqObj: function (reqObj) {
        if(reqObj.cookies){
            let cookies = []
            let cookieName = Object.keys(reqObj.cookies)

            cookies.push(cookieName + '='+ reqObj.cookies[cookieName])
            if(reqObj.headers){
                if(reqObj.headers['cookie']){
                    cookies.push(reqObj.headers['cookie'])
                    reqObj.headers['cookie'] = cookies
                }else{
                    reqObj.headers['cookie'] = cookies
                }
            }else{
                reqObj.headers = {}
                reqObj.headers['cookie'] = cookies
            }
        }
    }
}