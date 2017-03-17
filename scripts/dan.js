
//  Copyright © 2016, 2017 Stewart Smith. See LICENSE for details.




    //////////////
   //          //
  //   Boot   //
 //          //
//////////////


Moar.setupTasks.add( function(){


	//  Is WebGL available?

	if( Detector.webgl ){

		Moar.note({
		
			hitType:       'event',
			eventCategory: 'Capabilities',
			eventAction:   'WebGL Detect',
			eventLabel:    'WebGL is present',
			nonInteraction: true
		})


		//  Since we have WebGL we might as well setup THREE
		//  and begin loading our heavy assets. 

		Moar.setupThree()
		Object.assign( Moar.assets, {

			mark:             'media/day-and-night-mark.png',
			earthMapDay:      'media/earth.png',
			earthMapBump:     'media/earth-bump.png',
			earthMapSpecular: 'media/earth-specular.png',
			earthMapNight:    'media/earth-night.png',
			earthMapClouds:   'media/earth-clouds.png',
			moonMap:          'media/moon.png',
			moonMapBump:      'media/moon-bump.png',
			sunRays:          'media/sun-rays.jpg',
			starMap:          'media/star.png'
		})
		Moar.postLoadTasks.add( function(){


			//  Add Title to the floor.

			const mesh = new THREE.Mesh(

				new THREE.PlaneGeometry( 1, 1 ),
				new THREE.MeshBasicMaterial({

					map:         Moar.assets.mark,
					transparent: true,
					opacity:     0.06,
					alphaTest:   0.03,
					blending:    THREE.AdditiveBlending
				})
			)
			mesh.name = 'Day & Night'
			mesh.rotation.x = Math.PI / -2
			mesh.rotation.z = Math.PI / -2
			mesh.receiveShadow = false
			mesh.frustumCulled = false
			Moar.universe.add( mesh )


			Moar.solarSystem = new Moar.SolarSystem(

				Moar.assets.starMap
			)
			Moar.earth = new Moar.Earth( 

				Moar.assets.earthMapDay,
				Moar.assets.earthMapBump,
				Moar.assets.earthMapSpecular,
				Moar.assets.earthMapNight,
				Moar.assets.earthMapClouds
			)
			Moar.moon = new Moar.Moon( 

				Moar.assets.moonMap,
				Moar.assets.moonMapBump
			)
			Moar.sun = new Moar.Sun(

				Moar.assets.sunRays
			)
			Moar.earth.add( Moar.moon )
			Moar.solarSystem.add( Moar.earth )
			Moar.solarSystem.add( Moar.sun )
			Moar.solarSystem.position.set( 0, 0.9, 0 )
			Moar.universe.add( Moar.solarSystem )

			
			//  Time to lift the veil. 

			document.getElementById( 'three' ).classList.add( 'show' )
		})
		Moar.assetsLoad()




		//  Is WebVR available?

		if( navigator.getVRDisplays !== undefined ){

			Moar.note({
			
				hitType:       'event',
				eventCategory: 'Capabilities',
				eventAction:   'WebVR Detect',
				eventLabel:    'WebVR is present',
				nonInteraction: true
			})


			//  Detect head mounted display (HMD) presence. 

			navigator.getVRDisplays().then( function( displays ){

				if( displays.length > 0 ){

					Moar.note({
		
						hitType:       'event',
						eventCategory: 'Capabilities',
						eventAction:   'VR Display Detect',
						eventLabel:    'VR Display is present',
						value:          displays.length,
						nonInteraction: true
					})
					Moar.setupVRButton()
				}
				else {


					//  Oooooo! So close, but no VRDisplays found!

					Moar.note({
		
						hitType:       'event',
						eventCategory: 'Capabilities',
						eventAction:   'VR Display Detect',
						eventLabel:    'VR Display is absent',
						nonInteraction: true
					})
					document.getElementById( 'no-hmd' ).style.display = 'block'
					document.getElementById( 'errors' ).classList.add( 'show' )
				}
			})
		}
		else {


			//  Sorry, you need a VR-capable Web browser!

			Moar.note({
			
				hitType:       'event',
				eventCategory: 'Capabilities',
				eventAction:   'WebVR Detect',
				eventLabel:    'WebVR is absent',
				nonInteraction: true
			})
			document.getElementById( 'no-webvr' ).style.display = 'block'
			document.getElementById( 'errors' ).classList.add( 'show' )

			Moar.postLoadTasks.add( function(){

				//Moar.camera.position.set( -0.6, 1.6, 0 )


				//  Maintain a constant-radius orbit around the earth.

				Moar.updateTasks.add( function(){

					var
					degreesPerSecond = 4,//8,//0.5,
					radius = 1,
					x = Math.sin( Moar.clock.getElapsedTime() * degreesPerSecond * THREE.Math.DEG2RAD ) * radius,
					y = Moar.solarSystem.position.y + Math.sin( Moar.clock.getElapsedTime() * degreesPerSecond * THREE.Math.DEG2RAD ) * 1,
					z = Math.cos( Moar.clock.getElapsedTime() * degreesPerSecond * THREE.Math.DEG2RAD ) * radius

					Moar.camera.position.set( x, y, z )
					Moar.camera.lookAt( Moar.earth.getWorldPosition() )
				})
			})
		}
	}
	else {

		
		//  Sorry, you need WebGL, Pal!
		
		Moar.note({
		
			hitType:       'event',
			eventCategory: 'Capabilities',
			eventAction:   'WebGL Detect',
			eventLabel:    'WebGL is absent',
			nonInteraction: true
		})
		document.getElementById( 'no-webgl' ).style.display = 'block'
		document.getElementById( 'errors' ).classList.add( 'show' )
	}
})







