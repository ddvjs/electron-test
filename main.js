/*
**  Nuxt
*/
const { Nuxt, Builder } = require('nuxt')
let config = require('./nuxt.config.js')
config.rootDir = __dirname // for electron-builder
// Init Nuxt.js
const nuxt = new Nuxt(config)
const builder = new Builder(nuxt)

let isNuxtBuilderEnd = false
// 获取一个Nuxt实例
function getNuxt () {
	if (isNuxtBuilderEnd) {
		// 如果有nuxt就直接返回
		return Promise.resolve(nuxt)
	}
	// 试图获取配置信息
	return Promise.resolve()
		.then(() => {
			// Build only in dev mode
			if (config.dev) {
				// 开始构建
				return builder.build()
			}
		})
		.then(() => {
			isNuxtBuilderEnd = true
			// 返回nuxt实例
			return nuxt
		})
		.catch((err) => {
			console.error(err) // eslint-disable-line no-console
			process.exit(1)
		})
}
getNuxt()
/*
** Electron
*/
let win = null // Current window
const electron = require('electron')
const path = require('path')
const {PassThrough} = require('stream')
const app = electron.app
electron.protocol.registerStandardSchemes(['ddvelectron'], {
	secure: true
})
const handler = (request, callback)=>{
	const context = {}
	const url = request.url.substr('ddvelectron://www.abc.com'.length)
	console.log('request', request)
	getNuxt()
		.then(()=>nuxt.renderRoute(url, context))
		.then((res)=>{
			console.log(121)
			const rv = new PassThrough()  // PassThrough is also a Readable stream
			console.log(122)
			callback({
				data: rv,
				statusCode: 200,
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					'Content-Length': Buffer.byteLength(res.html)
				}
			})
			console.log(123)
			rv.push(res.html)
			rv.push(null)
		})
		.catch(e=>{
			const rv = new PassThrough()  // PassThrough is also a Readable stream
			callback({
				data: rv,
				statusCode: 500,
				headers: {
					'Content-Type': 'text/html; charset=utf-8'
				}
			})
			rv.push('unknow error')
			rv.push(null)
		})
}
const completion = error=> {
	if (error) {
		console.error('Failed to register protocol')
	}
}
require('electron-debug')({ showDevTools: true })
const newWin = () => {
	// 将自定义 ddvelectron schemes注册为处理线程服务的标准schemes
	electron.protocol.registerServiceWorkerSchemes(['ddvelectron'])
	// 注册一个 ddvelectron scheme 协议, 将 Readable作为响应发送
	electron.protocol.registerStreamProtocol('ddvelectron', handler, completion)
	win = new electron.BrowserWindow({
		icon: path.join(__dirname, 'static/icon.png')
	})
	win.maximize()
	win.on('closed', () => win = null)

	win.loadURL('ddvelectron://www.abc.com/')
	if (config.dev) {
		// Install vue dev tool and open chrome dev tools
		const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer')
		installExtension(VUEJS_DEVTOOLS.id).then(name => {
			console.log(`Added Extension:  ${name}`)
			win.webContents.openDevTools()
		}).catch(err => console.log('An error occurred: ', err))
	}
}
app.on('ready', newWin)
app.on('window-all-closed', () => app.quit())
app.on('activate', () => win === null && newWin())
