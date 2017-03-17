
//  Copyright © 2016, 2017 Stewart Smith. See LICENSE for details.

//  This file.... I really weep because it’s so terribly designed. 
//  I’m just too damned tired at this point to fully realize something beautiful. 




    /////////////////////
   //                 //
  //   Controllers   //
 //                 //
/////////////////////


Moar.setupTasks.add( function(){

	const scaleOrigin = new THREE.Object3D()
	Moar.scene.add( scaleOrigin )
	

	//  Ug. Looks like using Object.assign destroys VRController object...
	//  Double ug. Can’t use Object.entries because popular Safari version...

	const obj = {
		
		distanceBetweenPrior: 0,
		scalePrior:   1,
		scaleMin:     0.01,
		scaleMax:   100,
		scaleFactor:  5,
		triggerCount: 0,
		tempMatrix: new THREE.Matrix4(),
		scaleOrigin: scaleOrigin
	}
	for( let key in obj ){

		if( obj.hasOwnProperty( key )){

			THREE.VRController[ key ] = obj[ key ]
		} 
	}
})
function releaseObjectsFromController( controller ){

	if( controller.userData.selected !== undefined ){

		const object = controller.userData.selected
		object.matrix.premultiply( controller.matrixWorld )
		object.matrix.decompose( object.position, object.quaternion, object.scale )
		Moar.universe.add( object )
		controller.userData.selected = undefined
	}
}
function getPointBetweenByPercent( pointA, pointB, percentage ){// percentage = 0..1

	var 
	direction = pointB.clone().sub( pointA ),
	length = direction.length()
	
	if( percentage === undefined ) percentage = 0.5
	direction = direction.normalize().multiplyScalar( length * percentage )
	return pointA.clone().add( direction )
}
function onTriggerDown( event ){

	const 
	that = THREE.VRController,
	object = Moar.solarSystem
	
	let controller = event.target
	
	//if( controller.gamepad.hapticActuators ) controller.gamepad.hapticActuators[ 0 ].pulse( 0.3, 200 )
	that.triggerCount ++
	if( that.triggerCount === 1 ){

		that.isSingleDragging = true
		that.isDoubleDragging = false
	}
	else if( that.triggerCount === 2 ){


		//  This part here... I’m just so tired today. The sloppiness. It hurts. 

		let thing1, thing2
		Object.values( THREE.VRController.controllers ).forEach( function( thing ){

			if( thing1 === undefined ) thing1 = thing
			else if( thing2 === undefined ) thing2 = thing
			releaseObjectsFromController( thing )
		})
		that.isSingleDragging = false
		that.isDoubleDragging = true
		that.distanceBetweenPrior = thing1.getWorldPosition().distanceTo( thing2.getWorldPosition() )
		that.scalePrior = that.scaleOrigin.scale.x
		controller = that.scaleOrigin
	}
	that.tempMatrix.getInverse( controller.matrixWorld )
	object.matrix.premultiply( that.tempMatrix )
	object.matrix.decompose( object.position, object.quaternion, object.scale )
	controller.add( object )
	controller.userData.selected = object
}
function onTriggerUp( event ){

	const
	that = THREE.VRController,
	controller = event.target

	that.isSingleDragging = false
	that.isDoubleDragging = false
	if(      that.triggerCount === 1 ) releaseObjectsFromController( controller )
	else if( that.triggerCount === 2 ) releaseObjectsFromController( that.scaleOrigin )
	that.triggerCount = 0
}








//  This is the only thing you need to do to add controller support:
//  Call THREE.VRController’s update() function within your update loop.
//  That’s all! It will detect new controllers, update the positions
//  and rotations of existing ones, and alert you if one disconnects.

Moar.updateTasks.add( THREE.VRController.update.bind( THREE.VRController ))


//  We have to catch an instance of the controller on the global window
//  object first, then we can listen in for all future events on the 
//  controller instance itself. 

window.addEventListener( 'vr controller connected', function( event ){


	//  And here’s that controller instance we’ve been waiting for:

	const controller = event.detail


	//  First things first. We set the standing matrix based on our
	//  THREE control’s standing matrix. 
	//  Then we’ll add a reference to our camera -- this will only
	//  be used if our controller is 3DOF instead of 6DOF.
	//  Then add this controller (a glorified Object3D) to our scene. 

	controller.standingMatrix = Moar.controls.getStandingMatrix()
	controller.head = Moar.camera
	Moar.scene.add( controller )


	//  Here on stage for the first time in New York City 
	//  is VRController, in the style of... [controller.gamepadStyle]

	if( controller.gamepadStyle === 'daydream' ){

		const
		textureLoader = new THREE.TextureLoader(),
		texture = textureLoader.load( 'media/controllers/Daydream/daydream_diffuse.png' ),
		loader = new THREE.JSONLoader()
		loader.load( 'media/controllers/Daydream/daydream.json', function( geometry ){

			const mesh = new THREE.Mesh( 

				geometry,
				new THREE.MeshStandardMaterial({
				
					map: texture, 
					color: 0x666666, 
					metalness: 0,
					roughness: 0.6
				})
			)
			mesh.name = 'Daydream controller'
			mesh.castShadow = true
			mesh.receiveShadow = true
			controller.add( mesh )
		})


		//  We’re running on a phone, not a full blown gaming PC. 
		//  Killing the shadow maps will help keep the FPS up.
		//  https://github.com/mrdoob/three.js/issues/1055

		renderer.shadowMap.autoUpdate = false
		renderer.shadowMap.enabled = false
		floor.receiveShadow = false
		renderer.clearTarget( mainLight.shadowMap )
	}
	else if( controller.gamepadStyle === 'vive' ){

		let loader = new THREE.OBJLoader()
		loader.setPath( 'media/controllers/Vive/' )
		loader.load( 'vr_controller_vive_1_5.obj', function( object ){

			let loader = new THREE.TextureLoader()
			loader.setPath( 'media/controllers/Vive/' )

			const mesh = object.children[ 0 ]
			mesh.name = 'Vive controller'
			mesh.material.map = loader.load( 'onepointfive_texture.png' )
			mesh.material.specularMap = loader.load( 'onepointfive_spec.png' )
			mesh.castShadow = true
			mesh.receiveShadow = true
			controller.add( mesh.clone() )
		})
	}
	else if( controller.gamepadStyle === 'rift' ){

		let loader = new THREE.OBJLoader()
		loader.setPath( 'media/controllers/Rift/' )


		//  Left-handed Rift controller.

		if( controller.gamepad.id.match( /\(([^)]+)\)/ )[ 1 ] === 'Left' ){

			loader.load( 'oculus_cv1_controller_left.obj', function( object ){

				let loader = new THREE.TextureLoader()
				loader.setPath( 'media/controllers/Rift/' )

				const mesh = object.children[ 0 ]
				mesh.name = 'Rift controller LEFT'
				mesh.material.map = loader.load( 'oculus_cv1_controller_col.png' )
				mesh.material.specularMap = loader.load( 'oculus_cv1_controller_spec.png' )
				mesh.castShadow = true
				mesh.receiveShadow = true
				controller.add( mesh.clone() )
				controller.children[ 0 ].rotation.x = Math.PI / 3.5
				controller.children[ 0 ].position.y = 0.04
			})
		}


		//  Right-handed Rift controller.

		else if( controller.gamepad.id.match( /\(([^)]+)\)/ )[ 1 ] === 'Right' ){

			loader.load( 'oculus_cv1_controller_right.obj', function( object ){

				let loader = new THREE.TextureLoader()
				loader.setPath( 'media/controllers/Rift/' )

				const mesh = object.children[ 0 ]
				mesh.name = 'Rift controller RIGHT'
				mesh.material.map = loader.load( 'oculus_cv1_controller_col.png' )
				mesh.material.specularMap = loader.load( 'oculus_cv1_controller_spec.png' )
				mesh.castShadow = true
				mesh.receiveShadow = true
				controller.add( mesh.clone() )
				controller.children[ 0 ].rotation.x = Math.PI / 3.5
				controller.children[ 0 ].position.y = 0.04
			})
		}
	}


	//  This will work on every controller’s primary button!

	controller.addEventListener( 'primary press began', onTriggerDown )
	controller.addEventListener( 'primary press ended', onTriggerUp )


	//  If the controller dissappers we should too.
	//  We could probably do something more efficient than simply set it to invisible
	//  but this is just for illustration purposes, right? ;)

	controller.addEventListener( 'disconnected', function(){

		controller.visible = false
	})
})








Moar.updateTasks.add( function(){

	const that = THREE.VRController


	//  Find up to 2 controllers.

	let thing1, thing2
	Object.values( THREE.VRController.controllers ).forEach( function( thing ){

		if( thing1 === undefined ) thing1 = thing
		else if( thing2 === undefined ) thing2 = thing
	})
	if( thing1 !== undefined && thing2 !== undefined ){


		//  And update the midpoint accordingly.

		that.scaleOrigin.position.copy( getPointBetweenByPercent( thing1.getWorldPosition(), thing2.getWorldPosition() ))


		//  We also need to rotate our midpoint.
		//  May want to replace this with more general: getQuaternionBetweenPoints()

		that.scaleOrigin.lookAt( thing1.getWorldPosition() )


		//  If we’re double dragging then we also must update
		//  the scale based on the changing distance between controllers.

		if( that.isDoubleDragging ){

			distanceBetweenNow   = thing1.getWorldPosition().distanceTo( thing2.getWorldPosition() )
			distanceBetweenDelta = distanceBetweenNow - that.distanceBetweenPrior
			scaleNew = that.scalePrior + ( distanceBetweenDelta * that.scaleFactor )
			scaleNew = Math.max( scaleNew, that.scaleMin )
			scaleNew = Math.min( scaleNew, that.scaleMax )
			that.scaleOrigin.scale.set( scaleNew, scaleNew, scaleNew )
		}
	}
})







