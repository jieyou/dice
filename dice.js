/*!
 * author:jieyou
 * contacts:baidu hi->youyo1122
 * see https://github.com/jieyou/dice
 */
;(function(window,document,parseInt){

	// 初始化时各个面的rotate角度 // 初始状态下，2面向用户
	var diceStart = [
		null
		,{x:90,y:0,z:0} // rotateX,rotateY,rotate
		,{x:0,y:0,z:0}
		,{x:0,y:90,z:0}
		,{x:0,y:180,z:0}
		,{x:0,y:-90,z:0}
		,{x:-90,y:0,z:180}
	]

	// 6个结果对应的，需要将wrapper rotate的角度
	var diceResult = [
		null
		,{x:270,y:0,z:0} // roll出1
		,{x:0,y:0,z:0} // roll出2 // 初始状态下，2面向用户
		,{x:0,y:270,z:0} // roll出3
		,{x:180,y:0,z:180}
		,{x:0,y:90,z:0}
		,{x:90,y:0,z:180}
	]

	// 色子面共同和动画效果无关的css
	var faceStyle = {
		'position':'absolute'
		,'border':'5px solid #fff'
		//,'borderRadius':'5px' // todo：圆角大小可配 // done
		,'backgroundColor':'#fff'
		,'fontSize':'0'
		,'textAlign':'center'
	}

	function callType(obj){
		return Object.prototype.toString.call(obj)
	}

	var isArray = Array.isArray || function(arr){
		return callType(arr) === '[object Array]'
	}

	var forEach = Array.prototype.forEach || function(callback){
		var i = 0
			,t = this
			,len = t.length
		for(;i<len;i++){
			callback.call(t[i],t[i],i)
		}
	}

	// 各色子面单独html
	var faceHtml = {
		tpl:'<div class="dice_circle" style="#{margin};#{border};left:#{left}%;top:#{top}%;width:0;height:0;position:absolute;"></div>'
		,position:[
			null
			,[[50,50]]
			,[[50,30],[50,70]]
			,[[28,72],[50,50],[72,28]]
			,[[30,30],[30,70],[70,30],[70,70]]
			,[[28,28],[28,72],[50,50],[72,28],[72,72]]
			,[[28,22.5],[28,50],[28,77.5],[72,22.5],[72,50],[72,77.5]]
		]
		,html:[null]
	}
	;(function(faceHtml){
		forEach.call(faceHtml.position,function(e,i){
			var html = []
			if(e){
				forEach.call(e,function(e_,i_){
					html.push(faceHtml.tpl.replace('#{left}',e_[0]).replace('#{top}',e_[1]))
				})
				faceHtml.html[i] = html.join('')
			}
		})
		delete faceHtml.tpl
		delete faceHtml.position
	})(faceHtml)

	function emptyFn(){}

	function on(dom,event,func){
		if(dom.addEventListener){
			dom.addEventListener(event,func,false)
		}else{
			dom.attachEvent('on'+event,func)
		}
	}

	function off(dom,event,func){
		if(dom.removeEventListener){
			dom.removeEventListener(event,func,false)
		}else{
			dom.detachEvent('on'+event,func)
		}
	}

	function getRightJsStyleName(cssKey,prefixWord){
		if(prefixWord){
			return prefixWord+cssKey[0].toUpperCase()+cssKey.substr(1)
		}
		return cssKey
	}

	// 检测是否支持 `transform-style:preserve-3d`
	var supportPreserve3d = (function(){
		// 安卓3.0以下（不含）通过此方法无法检测（即使在不支持的情况下，使用getComputedStyle或直接div.style[styleName]还是会返回'preserve-3d'），这里写搓一点
		// IE均不支持，但IE9无法通过此法来检测，这里写搓一点
		// 后来发现UC也有问题，这里写搓一点
		// 后来发现遨游也有问题，这里写搓一点
		// 已经在zhihu发帖准备解决这个问题：
		var isAndroid = navigator.userAgent.match(/(Android);?[\s\/]+([\d.]+)?/)
			,version
			,isAndorid3Below = false
			,isIE = /MSIE/i.test(navigator.userAgent)
			,isUC = /UCBrowser/i.test(navigator.userAgent)
			,isMaxthon = /Maxthon/i.test(navigator.userAgent)
			,div = document.createElement('DIV')
		if(isAndroid){
			version = parseFloat(isAndroid[2])
			isAndorid3Below = !isNaN(version) && version < 3
		}
		return function(prefixWord){
			var styleName
			if(isAndorid3Below || isIE || isUC || isMaxthon){
				return false
			}
			styleName = getRightJsStyleName('transformStyle',prefixWord)
			div.style[styleName] = 'preserve-3d'
			return !!div.style[styleName].length
		}
	})()

	// 确定制造商前缀及支持preserve-3d情况，不光是有前缀，同时支持3d动画时prefix才不为null
	var prefix
	var prefixWord
	;(function(style,string){
		if(typeof style.webkitTransform === string && supportPreserve3d('webkit')){
			prefix = '-webkit-'
			prefixWord = 'webkit'
		}else if(typeof style.MozTransform === string && supportPreserve3d('Moz')){
			prefix = '-moz-'
			prefixWord = 'Moz'
		}else if(typeof style.msTransform === string && supportPreserve3d('ms')){ // IE10及以下 都不支持 所需关键属性 `transform-style:preserve-3d` 故暂时不兼容IE
			prefix = '-ms-'
			prefixWord = 'ms'
		}else if(typeof style.transform === string && supportPreserve3d('')){
			prefix = prefixWord = ''
		}else{
			prefix = prefixWord = null
		}
		// 调试不支持的情况的代码，将prefix、prefixWord写死为null
		// prefix = prefixWord = null
	})(document.body.style,'string')

	// console.log(prefix)

	// 标准化和降级兼容原生的requestAnimationFrame
	// 安卓4.4以下（不含）不支持requestAnimationFrame
	var requestAnimationFrame_ = window.requestAnimationFrame 
	|| window[getRightJsStyleName('requestAnimationFrame',prefixWord)]
	|| function(callback){
		return setTimeout(callback,17)
	}
	// 调试setTimeout
	// var requestAnimationFrame_ =function(callback){
	// 	return setTimeout(callback,17)
	// }

	var cancelAnimationFrame_ = window.cancelAnimationFrame 
	|| window[getRightJsStyleName('cancelAnimationFrame',prefixWord)]
	|| clearTimeout
	// 调试clearTimeout
	// var cancelAnimationFrame_ = clearTimeout

	// 在参数数组中获取一个随机数
	function random(arr) {
		var len = arr.length
		// if(isArray(arr)){ // 注释掉判断是否为一个数组的部分，在入口函数中已经确保了
		// 	len = arr.length
		if(len === 1){
			return arr[0]
		}
		return arr[Math.floor(Math.random()*len)]
		// }else{
		// 	return arr
		// }
	}

	// 赋予css
	function css(domOrCssStr,oneKeyOrKeyValueObject,oneValue){
		var key
		// if(arguments.length === 1){ // 已经不存在需要拼装的css文本了，暂时注释掉
		// 	key = document.createElement('STYLE')
		// 	key.innerHTML = domOrCssStr
		// 	document.getElementsByTagName('HEAD')[0].appendChild(key)
		// }
		if(arguments.length === 3){
			domOrCssStr.style[oneKeyOrKeyValueObject] = oneValue
		}else{
			for(key in oneKeyOrKeyValueObject){
				if(oneKeyOrKeyValueObject.hasOwnProperty(key)){
					domOrCssStr.style[key] = oneKeyOrKeyValueObject[key]
				}
			}
		}
	}

	function keepAnimation(dice){
		// 目前firefox 30 在第二次roll的时候keepAnimation阶段显示不正常或没有动作，暂时没有办法修复
		dice.dtime = new Date().getTime() - dice.stime
		if(dice.dtime>dice.keepAnimationTime){
			dice._onKeepAnimationEnd()
			endAnimation(dice)
			return
		}
		if(prefix !== null){
			dice.rafId = requestAnimationFrame_(function(){ // 最开始进来的时候也考虑requestAnimationFrame_ 提高性能
				keepAnimation(dice)
			})
			// var a = 'rotateZ(' + dice.zAngle + 'deg) rotateX(' + dice.xAngle + 'deg) rotateY(' + dice.yAngle +'deg)'
			// (prefix==='-moz-'?'':prefix)+'transform'
			css(dice.wrapper,getRightJsStyleName('transform',prefixWord),'rotate(' + dice.zAngle + 'deg) rotateX(' + dice.xAngle + 'deg) rotateY(' + dice.yAngle +'deg)')
			// todo:可以顺时针转或逆时针，也就是angle既可以+10，也可以-10
			dice.curRollIsRotateX?dice.yAngle = 0:dice.xAngle = 0
			dice.zAngle = dice.zAngle>360? dice.zAngle-360 : dice.zAngle+10
			// x与y任意旋转一个即可，随机一下
			dice.curRollIsRotateX?
				(dice.xAngle = dice.xAngle>360? dice.xAngle-360 : dice.xAngle+10):
				(dice.yAngle = dice.yAngle>360? dice.yAngle-360 : dice.yAngle+10)
		}
	}

	function endAnimation(dice){
		var val
		cancelAnimationFrame_(dice.rafId)
		dice.rafId = null
		dice.dtime = 0
		val = diceResult[dice.result]
		// off first
		on(dice.wrapper,getRightJsStyleName('transitionEnd',prefixWord),dice._onEndAnimationEnd)
		on(dice.wrapper,getRightJsStyleName('transitionEnd',prefixWord),dice._onRollEnd)
		css(dice.wrapper,getRightJsStyleName('transition',prefixWord),prefix+'transform '+(dice.endAnimationTime/1000)+'s ease-out')
		css(dice.wrapper,getRightJsStyleName('transform',prefixWord),'rotate(' + val.z + 'deg) rotateX(' + val.x + 'deg) rotateY(' + val.y +'deg)')
		// dice.onEndAnimationEnd.call(dice,dice.result) // 更多的参数待定
	}

	function noAnimation(dice){
		var circles
		forEach.call([1,2,3,4,5,6],function(e){
			var face = dice['face'+e]
			if(e === dice.result){
				circles = face.getElementsByTagName('DIV') // IE8-  不支持getElementsByClassname，好在除此之外没有别的元素了
				forEach.call(circles,function(c){
					c.style.display = 'none'
				})
				face.style.zIndex = '2000'
			}else{
				face.style.zIndex = '1000'
			}
		})
		setTimeout(function(){
			forEach.call(circles,function(c){
				c.style.display = 'block'
			})
			dice._onNoAnimationEnd()
			dice._onRollEnd()
		},200) // todo:时间可配
	}

	function Dice(container,formattedConfig){
		var t = this
		forEach.call(['edgeLength','radius','hasShadow','shadowTop','keepAnimationTime','endAnimationTime'],function(e,i){
			t[e] = formattedConfig[e]
		})
		t._onKeepAnimationEnd = function(){
			formattedConfig.onKeepAnimationEnd.call(t,t.result)
		}
		t._onEndAnimationEnd = function(){
			formattedConfig.onEndAnimationEnd.call(t,t.result)
		}
		t._onNoAnimationEnd = function(){
			formattedConfig.onNoAnimationEnd.call(t,t.result)
		}
		t._onRollEnd = function(){
			formattedConfig.onRollEnd.call(t,t.result)
		}
		// t.translateZ // 默认与棱长一致
		// 下面是static
		t.zAngle = 0 // x轴rotate初始状态
		t.yAngle = 0
		t.xAngle = 0
		t.rafId = null // requestAnimationFrame 返回的id
		t.stime = 0
		t.dtime = 0

		// 底部阴影
		if(t.hasShadow){
			t.shadow = document.createElement('DIV')
			css(t.shadow,{
				'position': 'absolute'
				,'left': '50%'
				,'top': t.shadowTop+'%'
				,'height': '0'
				,'width': t.edgeLength*4/10+'px'
				// ,'boxShadow': '0 0 '+t.edgeLength+'px '+t.edgeLength*35/100+'px rgba(0, 0, 0, 0.7)'
				,'marginLeft': '-'+t.edgeLength*2/10+'px'
			})
			// firefox 30 不认识 -moz-box-shadow，但认识box-shadow
			css(t.shadow,prefixWord==='Moz'?'boxShadow':getRightJsStyleName('boxShadow',prefixWord),'0 0 '+t.edgeLength+'px '+t.edgeLength*35/100+'px rgba(0, 0, 0, 0.7)')
			t.shadow.className = 'dice_shadow'
			container.appendChild(t.shadow)
		}

		forEach.call(['wrapper','face1','face2','face3','face4','face5','face6'],function(e,i){
			t[e] = document.createElement('DIV')
			if(e === 'wrapper'){
				// t[e].style.a
				css(t[e],{
					'position': 'absolute'
					,'height': t.edgeLength + 'px'
					,'width': t.edgeLength + 'px'
					,'top': '50%'
					,'left': '50%'
					,'marginLeft': '-'+(t.edgeLength/2)+'px'
					,'marginTop': '-'+(t.edgeLength/2)+'px'
				})
				if(prefix !== null){
					css(t[e],getRightJsStyleName('transformStyle',prefixWord),'preserve-3d')
					// css(t[e],getRightJsStyleName('transform',prefixWord),'translateX(0px)')
					css(t[e],getRightJsStyleName('transformOrigin',prefixWord),'50% 50%')
					// css(t[e],getRightJsStyleName('transition',prefix+'transform 0s ease-in-out')
				}
				t[e].className = 'dice_wrapper'
			}else{
				css(t[e],faceStyle)
				css(t[e],{
					'height':(t.edgeLength-10)+'px' // 10为每个面的圆角，如果圆角也要自适应棱长，则这个10的数字也要更改为计算出来的
					,'width':(t.edgeLength-10)+'px'
					// ,'lineHeight':(t.edgeLength-10)+'px'
					,'borderRadius':t.radius+'px'
				})
				// css(t[e],getRightJsStyleName('backfaceVisibility',prefixWord),'hidden')
				if(prefix !== null){
					css(t[e],getRightJsStyleName('transform',prefixWord),'rotateX('+diceStart[i].x+'deg) rotateY('+diceStart[i].y+'deg) rotate('+diceStart[i].z+'deg) translateZ('+(t.edgeLength/2)+'px)')
					// css(t[e],getRightJsStyleName('perspective',prefixWord),'800px')
				}
				t[e].className = 'dice_face dice_' + e
				t[e].innerHTML = faceHtml.html[i].replace(/\#\{margin\}/g,'margin-top:-'+(t.edgeLength/10)+'px;margin-left:-'+(t.edgeLength/10)+'px').replace(/\#\{border\}/g,'border:'+(t.edgeLength/10)+'px #'+((i===1||i===4)?'F':'0')+'00 solid;border-radius:'+(t.edgeLength/10)+'px')
				t.wrapper.appendChild(t[e])
			}
		})
		css(container,'position','relative')
		if(prefix !== null){
			css(container,getRightJsStyleName('perspective',prefixWord),'800px')
			css(container,getRightJsStyleName('perspectiveOrigin',prefixWord),'50% 50%')
		}
		container.appendChild(t.wrapper)
	}
	Dice.prototype.roll = function(valueArr){ // todo：提供单次roll的 keepAnimationTime,endAnimationTime,thisRollOnKeepAnimationEnd,thisRollOnEndAnimationEnd 可配，只在这一次roll中生效
		var t = this
			,_valueArr
			,v
			,timeLen
			,isS = false
		if(t.rafId !== null){
			return
		}
		if(isArray(valueArr)){
			_valueArr = []
			forEach.call(valueArr,function(e,i){
				v = parseInt(e,10)
				if(v>=1 && v<=6){
					_valueArr.push(v)
				}
			})
		}else if(typeof(valueArr) === 'number'){
			_valueArr = [valueArr]
		}
		if(!_valueArr || (isArray(_valueArr) && !_valueArr.length)){
			_valueArr = [1,2,3,4,5,6]
		}
		t.result = random(_valueArr)

		if(prefix !== null){
			t.curRollIsRotateX = !!random([0,1])
			css(t.wrapper,prefix+'transition',prefix+'transform 0s linear')
			t.stime = new Date().getTime()
			off(t.wrapper,getRightJsStyleName('transitionEnd',prefixWord),t._onEndAnimationEnd)
			off(t.wrapper,getRightJsStyleName('transitionEnd',prefixWord),t._onRollEnd)
			requestAnimationFrame_(function(){keepAnimation(t)})
		}else{
			noAnimation(t)
		}

		return t.result
	}
	Dice.prototype.stop = function(){
		var t = this
		if(t.rafId !== null){
			cancelAnimationFrame_(t.rafId)
			t.rafId = null
		}
	}

	// 可配项和默认配置
	var defaultConfig = {
		edgeLength:100
		,radius:5
		,hasShadow:true
		,shadowTop:75
		,keepAnimationTime:3000
		,endAnimationTime:1000
		,onKeepAnimationEnd:emptyFn
		,onEndAnimationEnd:emptyFn
		,onNoAnimationEnd:emptyFn
		,onRollEnd:emptyFn
	}

	window.dice = function(container,userConfig){
		var k
			,formattedConfig
		if(arguments.length === 0){
			return
		}
		if(!userConfig){
			formattedConfig = defaultConfig
		}else{
			formattedConfig = {}
			for(k in defaultConfig){
				if(userConfig.hasOwnProperty(k) && defaultConfig.hasOwnProperty(k) && callType(defaultConfig[k]) === callType(userConfig[k])){
					formattedConfig[k] = userConfig[k]
				}else{
					formattedConfig[k] = defaultConfig[k]
				}
			}
		}
		return new Dice(container,formattedConfig)
	}

})(window,document,parseInt)