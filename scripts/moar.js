
//  Copyright © 2016, 2017 Stewart Smith. See LICENSE for details.




var Moar = {

	MAJOR: 2017.0317,
	MINOR: 18.52,
	verbosity: 0.5,
	



	applicationTitle: 'Moar',
	hashIsUpdatable: false,
	isPaused: false,
	clock: new THREE.Clock(),
	utils: {

		
		//  Expects a function containing a multiline comment.
		//  The commented section will be returned as a string.

		parseMultilineString: function( f ){

			f = f.toString()
			return f.substring( 

				f.indexOf( '/'+'*' ) + 2, 
				f.lastIndexOf( '*'+'/' )
			)
		}
	},
	

	//  Console logging.

	note: function( obj ){

		if( Moar.verbosity >= 0.5 ) console.log( 'Note:', obj )
		if( window.ga !== undefined && typeof window.ga === 'function' ){

			ga( 'send', obj )
			if( Moar.verbosity >= 0.5 ) console.log( 'Noted.' )
		}
	},
	noteOutboundLink: function( a ){

		var url = a.getAttribute( 'href' )
		
		if( Moar.verbosity >= 0.5 ) console.log( 'Note:', url )
		if( window.ga !== undefined && typeof window.ga === 'function' ){
		
			ga( 'send', 'event', 'outbound', 'click', url, {
			
				transport: 'beacon',
				hitCallback: function(){}
				//hitCallback: function(){ document.location = url }
			})
		}
		return true
		//return false
	},


	//  Setup.
	
	setup: function(){

		Moar.setupTasks.run().clear()
		Moar.update()
	},
	setupTasks: new TaskList(),


	//  Load assets.

	assets: {},
	assetsLoaded: 0,
	assetsLoad: function(){

		var loader = new THREE.TextureLoader()

		Object.keys( Moar.assets ).forEach( function( assetName ){

			Moar.assets[ assetName ] = loader.load( Moar.assets[ assetName ], Moar.onAssetLoaded )
		})
	},
	onAssetLoaded: function(){

		Moar.assetsLoaded ++
		if( Moar.assetsLoaded > Object.keys( Moar.assets ).length - 1 ) Moar.onAssetsLoaded()
	},
	onAssetsLoaded: function(){

		Moar.postLoadTasks.forEach( function( task ){

			if( typeof task === 'function' ) task()
		})
	},
	postLoadTasks: new TaskList(),


	//  Update.
	
	update: function(){

		const vrDisplay = Moar.effect.getVRDisplay()
		if( vrDisplay !== undefined ) vrDisplay.requestAnimationFrame( Moar.update )
		else window.requestAnimationFrame( Moar.update )
		Moar.updateTasks.run()
		Moar.render()
	},
	updateTasks: new TaskList()
}
document.addEventListener( 'DOMContentLoaded', Moar.setup )






    /////////////////
   //             //
  //   Anchors   //
 //             //
/////////////////


Moar.watch2DViewport = function(){

	if( Moar.hashIsUpdatable === true ){
	
		var
		documentScrolledTo = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0,
		documentHeight     = document.documentElement.scrollHeight,
		viewportHeight     = window.innerHeight,
		hash               = '',
		label              = Moar.applicationTitle

		Array.from( document.querySelectorAll( '.anchor' )).forEach( function( element ){

			var
			anchorY         = element.offsetTop,
			anchorHeight    = element.offsetHeight,
			topLine         = Math.max( anchorY, documentScrolledTo ),
			bottomLine      = Math.min( documentScrolledTo + viewportHeight, anchorY + anchorHeight ),
			viewportPercent = ( bottomLine - topLine ) / viewportHeight,
			anchorPercent   = ( bottomLine - topLine ) / anchorHeight

			if( viewportPercent >= 0.5 || anchorPercent >= 0.5 ){

				hash  = '#'+ element.getAttribute( 'hash' )
				label = Moar.applicationTitle +': ' + element.getAttribute( 'label' )
			}
		})
		if( hash != history.state && !( hash === '' && history.state === null )){
			
			history.pushState( hash, label, document.location.pathname + document.location.search + hash )
			if( window.ga !== undefined && typeof window.ga === 'function' ){

				ga( 'set', {
				
					page:  document.location.pathname + document.location.search + hash,
					title: label
				})
				ga( 'send', 'pageview' )
			}
			if( Moar.verbosity >= 0.6 ) console.log( 'Note:', label, document.location.pathname + document.location.search + hash )
		}
		if( document.title !== label ) document.title = label
	}
	Moar.hashIsUpdatable = true
}
Moar.setupTasks.add( Moar.watch2DViewport )
Moar.updateTasks.add( Moar.watch2DViewport )






    ///////////////////
   //               //
  //   Interface   //
 //               //
///////////////////


Moar.setupVRButton = function(){

	var 
	button = document.getElementById( 'vr-toggle-container' ),
	three  = document.getElementById( 'three' )

	button.style.display = 'block'
	button.onclick = function() {

		if( Moar.effect.isPresenting ){
			
			Moar.note({
			
				hitType:       'event',
				eventCategory: 'VR Session',
				eventAction:   'VR Exit',
				eventLabel:    'VR exit attempted'
			})
			three.classList.remove( 'show' )
			button.classList.remove( 'ready' )
			window.setTimeout( function(){ Moar.effect.exitPresent() }, 500 )
		}
		else {

			Moar.note({
			
				hitType:       'event',
				eventCategory: 'VR Session',
				eventAction:   'VR Entry',
				eventLabel:    'VR entry attempted'
			})
			three.classList.remove( 'show' )
			button.classList.add( 'engaged' )
			window.setTimeout( function(){ Moar.effect.requestPresent() }, 500 )
		}
	}
	window.addEventListener( 'vrdisplaypresentchange', function( event ){

		if( Moar.effect.isPresenting ){

			Moar.note({
			
				hitType:       'event',
				eventCategory: 'VR Session',
				eventAction:   'VR Entry',
				eventLabel:    'VR entry successful',
				nonInteraction: true
			})
			button.classList.add( 'ready' )
		}
		else {

			Moar.note({
			
				hitType:       'event',
				eventCategory: 'VR Session',
				eventAction:   'VR Exit',
				eventLabel:    'VR exit successful',
				nonInteraction: true
			})
			button.classList.remove( 'engaged' )
		}
		three.classList.add( 'show' )
	
	}, false )
	Moar.setupSwipeAnimation()
}
Moar.setupSwipeAnimation = function(){

	var
	toggleOff     = document.getElementById( 'vr-toggle-off' ),
	textLength    = toggleOff.textContent.trim().length,
	framesPerChar = 60,
	f = framesPerChar * textLength * -2, 
	n, grey, alpha
	
	function animate(){

		Array.from( toggleOff.querySelectorAll( 'span' )).forEach( function( element, index ){

			f ++
			if( f > framesPerChar * textLength * 2 ) f = framesPerChar * textLength * -2
			n = 1 / ( Math.abs(( f / framesPerChar ) - index ) + 1 )
			grey  = Math.round(( 0.5 + n * 0.5 ) * 255 )
			alpha = n
			element.style.color = 'rgb('+ grey +','+ grey +','+ grey +')'
			element.style.textShadow = '0 0 12px rgba(255,255,255,'+ alpha +')'
		})
		requestAnimationFrame( animate )
	}

	toggleOff.innerHTML = '<span>' + toggleOff.textContent.trim().split( '' ).join( '</span><span>' ) +'</span>'
	animate()
}
Moar.setupKeyCommands = function(){

	window.addEventListener( 'keypress', function( e ){

		var 
		keyCode = e.keycode ? e.keycode : e.which
		keyChar = String.fromCharCode( keyCode ).toUpperCase()

		if( keyChar === ' ' ) Moar.togglePaused()
		
	}, false )
}
Moar.togglePaused = function(){

	Moar.isPaused = !Moar.isPaused
}
Moar.utils.toggleShowDomElement = function( id ){

	var 
	element = document.getElementById( id ),
	showing = element.classList.contains( 'show' )

	if( !showing ) element.classList.add( 'show' )
	else element.classList.remove( 'show' )
}






    ///////////////
   //           //
  //   Three   //
 //           //
///////////////


Moar.setupThree = function(){

	var
	container = document.getElementById( 'three' ),
	angle     = 70,
	width     = container.offsetWidth  || window.innerWidth,
	height    = container.offsetHeight || window.innerHeight,
	aspect    = width / height,
	near      = 0.1,
	far       = 1000 * 10
	

	//  Fire up the WebGL renderer.

	Moar.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
	Moar.renderer.setPixelRatio( window.devicePixelRatio )
	Moar.renderer.setSize( width, height )
	Moar.renderer.sortObjects = false
	container.appendChild( Moar.renderer.domElement )
	window.addEventListener( 'resize', Moar.onThreeResize, false )


	//  Create the scene tree to attach objects to.

	Moar.scene = new THREE.Scene()
	Moar.scene.name = 'Moar.scene'


	//  Create and place the camera.

	Moar.camera = new THREE.PerspectiveCamera( angle, aspect, near, far )
	Moar.camera.name = 'Moar.camera'
	Moar.camera.position.z = 3.5
	Moar.scene.add( Moar.camera )


	//  Get those VR controls in charge of our camera.

	Moar.controls = new THREE.VRControls( Moar.camera )
	Moar.controls.name = 'controls'
	Moar.controls.standing = true
	Moar.updateTasks.add( Moar.controls.update.bind( Moar.controls ))


	//  Effect for when it’s time to take our single camera
	//  and split it into two for stereoscopics!

	Moar.effect = new THREE.VREffect( Moar.renderer )
	Moar.effect.name = 'Moar.effect'


	//  Aaaaaaaand this could be useful for animation, eh?

	Moar.clock = new THREE.Clock()


	//  The “Scene” is our outer most container, right?
	//  It needs to handle real immutable things like displaying your controllers
	//  where they actually are and at their actual size. 
	//  But the universe we create here (and attach to the scene) IS mutable.
	//  You can drag it, rotate it, pinch it, zoom it, etc. 

	Moar.universe = new THREE.Object3D()
	Moar.universe.name = 'Moar.universe'
	Moar.scene.add( Moar.universe )
}
Moar.onThreeResize = function(){

	var
	container = document.getElementById( 'three' ),
	width     = container.offsetWidth  || window.innerWidth,
	height    = container.offsetHeight || window.innerHeight

	Moar.camera.aspect = width / height
	Moar.camera.updateProjectionMatrix()
	Moar.effect.setSize( width, height )
	if( typeof Moar.controls.handleResize === 'function' ) Moar.controls.handleResize()
	container = null
}
Moar.render = function(){
	
	Moar.effect.render( Moar.scene, Moar.camera )
}







