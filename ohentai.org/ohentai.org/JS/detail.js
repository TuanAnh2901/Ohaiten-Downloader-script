$(document).ready(function(){			   

	detailcontainerabso();
	$(window).resize(function(){ detailcontainerabso(); }); 
	
	
	$('.embedbutton').click(function(){
			if($(this)[0].hasAttribute('id'))
			{ $(this).removeAttr('id');
			 $('.detailtextarea').slideUp(50);
			}
			else
			{ $(this).attr('id','selected'); 
			$('.detailtextarea').slideDown(50);
				if($('.downloadbutton')[0].hasAttribute('id')){
					$('.downloadbutton').removeAttr('id');
					$('.downloadlinkcontainer').slideUp(50);
				}
			}
							  
								  
								  });
	
	
	$('.downloadbutton').click(function(){
			if($(this)[0].hasAttribute('id'))
			{ $(this).removeAttr('id');
		  	
			 $('.downloadlinkcontainer').slideUp(50);
			}
			else
			{ $(this).attr('id','selected'); 
			$('.downloadlinkcontainer').slideDown(50);
			if($('.embedbutton')[0].hasAttribute('id')){
					$('.embedbutton').removeAttr('id');
					$('.detailtextarea').slideUp(50);
				}

				
			}
							  
								  
								  });
	

	
	$('.detailleftadcontainer i').click(function(){
			 $(this).parent('.fullwidth').parent('.detailleftadcontainer').hide();
															   
		  });
	
	
	

	$('.mobileshowmore').click(function(){
			
			if($('.inforow').hasClass("mobileshow")){
				 $('.inforow').removeClass("mobileshow")
				  $('.mobileshowmore').html('Show Video Detail<i class="fas fa-chevron-down"></i>')
				}
				else{  $('.inforow').addClass("mobileshow")
				
				$('.mobileshowmore').html('Hide Video Detail<i class="fas fa-chevron-up"></i>')
				}


	});

	
     });






function detailcontainerabso(){

	
	if($(window).width()>1880)
	{   var usagelength=1880-120;
		
		var rightwidth = 380; 
		var mainwidth = usagelength - rightwidth-50;
		
		var rightimagewidth = 150;
		var rightlist = rightwidth;
		
		
		$('.videodetailcontainer').css('width',usagelength);
		$('.videowrapper').css('width',mainwidth);
		$('.detaildiscussionpanel').css('width',mainwidth);
		
		$('.detaildesktopfullwidthbanner iframe').css({'width':mainwidth,'height':(mainwidth)*110/1323});


		$('.rightcontainer').css({'width':rightwidth,'marginRight':0});
		$('.rightcontainerrow').css({'width':rightwidth});
		
		$('.detailreclist').css({'width':rightlist});
		$('.detailreclist img').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		$('.detailreclist .detailrectiframecontainer').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		$('.detailrecadtag').css({'marginLeft':rightimagewidth-35-10});
		
		
		
		$('.playlistcount').css({'height':rightimagewidth*9/16,'marginLeft':rightimagewidth-60});
		$('.playlistnum').css({'marginTop':(rightimagewidth*9/16-42)/2});

		$('.detailrecinfo').css({'width':rightwidth-rightimagewidth-15});

		$('.descriptionsection').css('width',mainwidth-145);
		
		$('.detailonginfocontainer').css('width',mainwidth-40);
		
		
		$('#topdetailad .listadcontainertag').css('marginLeft',(mainwidth-728)/2+10);
		$('#bottomdetailad .listadcontainertag').css('marginLeft',(mainwidth-900)/2+10);
		
		
		$('.detailcontentadiframecontainer').css('marginLeft',(mainwidth-728)/2);
		$('.detailcontentadiframecontainer_900').css('marginLeft',(mainwidth-900)/2);
		
		
		
		$('.detailleftadcontainer').css({'width':rightwidth-20,'marginLeft':0});
		
		$('.detailleftiframecontainer_315').css('marginLeft',(rightwidth-20-315)/2);
		
		$('.detailleftiframecontainer_300').css('marginLeft',(rightwidth-20-300)/2);
		
		
		var customizedleftbannerwidth = parseInt($('.detailleftiframecontainer_customized').css('width'));
		
		
		$('.detailleftiframecontainer_customized').css('marginLeft',(rightwidth-20-customizedleftbannerwidth)/2);
		
		
	
	}
	
	else if($(window).width()<=1880&$(window).width()>1150)
	{	
		var usagelength=$(window).width()-40;
		
		var rightwidth = 380; 
		var mainwidth = usagelength - rightwidth-50;
		var rightimagewidth = 150;
		var rightlist = rightwidth;
		
		
		$('.videodetailcontainer').css('width',usagelength);
		$('.videowrapper').css('width',mainwidth);

		$('.detaildesktopfullwidthbanner iframe').css({'width':mainwidth,'height':(mainwidth)*110/1323});

		$('.detaildiscussionpanel').css('width',mainwidth);
		
		$('.rightcontainer').css({'width':rightwidth,'marginRight':0});
		$('.rightcontainerrow').css({'width':rightwidth});
		
		$('.detailreclist').css({'width':rightlist});
		$('.detailreclist img').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		$('.detailreclist .detailrectiframecontainer').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		$('.detailrecadtag').css({'marginLeft':rightimagewidth-35-7});
		
		$('.detailleftadcustomized').css({'width':rightwidth-20,'marginLeft':0});
		
		
		$('.playlistcount').css({'height':rightimagewidth*9/16,'marginLeft':rightimagewidth-60});
		$('.playlistnum').css({'marginTop':(rightimagewidth*9/16-42)/2});

		$('.detailrecinfo').css({'width':rightwidth-rightimagewidth-15});

		$('.descriptionsection').css('width',mainwidth-145);
		$('.detailonginfocontainer').css('width',mainwidth-40);
		
		
		if(mainwidth>=728){
			$('#topdetailad .listadcontainertag').css('marginLeft',(mainwidth-728)/2+10);
			$('.detailcontentadiframecontainer').css('marginLeft',(mainwidth-728)/2);
		}
		else {
			$('#topdetailad .listadcontainertag').css('marginLeft',10);
			$('.detailcontentadiframecontainer').css('marginLeft',0);
		}
		

		
		if(mainwidth>=900){
			$('#bottomdetailad .listadcontainertag').css('marginLeft',(mainwidth-900)/2+10);
			$('.detailcontentadiframecontainer_900').css('marginLeft',(mainwidth-900)/2);
		}
		else {
			$('#bottomdetailad .listadcontainertag').css('marginLeft',10);
			$('.detailcontentadiframecontainer_900').css('marginLeft',0);
		}
		
	
		$('.detailleftadcontainer').css({'width':rightwidth-20,'marginLeft':0});
		
		$('.detailleftiframecontainer_315').css('marginLeft',(rightwidth-20-315)/2);
		
		$('.detailleftiframecontainer_300').css('marginLeft',(rightwidth-20-300)/2);
		
		
		var customizedleftbannerwidth = parseInt($('.detailleftiframecontainer_customized').css('width'));
		
		$('.detailleftiframecontainer_customized').css('marginLeft',(rightwidth-20-customizedleftbannerwidth)/2);
		
		
		
	}
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	else if($(window).width()<=1150&$(window).width()>1024)
	{	
	    var usagelength=$(window).width()-20;
		
		var rightwidth = usagelength; 
		var mainwidth = usagelength - 20 ;
		
		var rightlist = rightwidth/2-20;
		var rightimagewidth = rightlist;
		
		
		$('.videodetailcontainer').css('width',usagelength);
		$('.videowrapper').css('width',mainwidth);
		
		$('.detaildesktopfullwidthbanner iframe').css({'width':mainwidth,'height':(mainwidth)*110/1323});


		$('.detaildiscussionpanel').css('width',mainwidth);
		
		$('.rightcontainer').css({'width':rightwidth,'marginRight':0});
		$('.rightcontainerrow').css({'width':rightwidth-20});

		$('.detailreclist').css({'width':rightlist});
		$('.detailreclist img').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		
		$('.detailreclist .detailrectiframecontainer').css({'width':rightimagewidth,'height':rightimagewidth*9/16,'marginLeft':0});
		
		
		$('.detailrecadtag').css({'marginLeft':rightimagewidth-35-10});
		
		$('.detailleftadcustomized').css({'width':350,'marginLeft':(rightwidth-350-20)/2});
		
		$('.playlistcount').css({'height':rightimagewidth*9/16,'marginLeft':rightimagewidth-60});
		$('.playlistnum').css({'marginTop':(rightimagewidth*9/16-42)/2});

		$('.detailrecinfo').css({'width':rightimagewidth});

		$('.descriptionsection').css('width',mainwidth-145);
		$('.detailonginfocontainer').css('width',mainwidth-40);
		
		
		$('#topdetailad .listadcontainertag').css('marginLeft',(mainwidth-728)/2+10);
		$('.detailcontentadiframecontainer').css('marginLeft',(mainwidth-728)/2);
			
			
		$('#bottomdetailad .listadcontainertag').css('marginLeft',(mainwidth-900)/2+10);
		$('.detailcontentadiframecontainer_900').css('marginLeft',(mainwidth-900)/2);
		
		
		
		
		
		$('.detailleftadcontainer').css({'width':rightwidth-20,'marginLeft':0});
		
		$('.detailleftiframecontainer_315').css('marginLeft',(rightwidth-20-315)/2);
		$('.detailleftiframecontainer_300').css('marginLeft',(rightwidth-20-300)/2);
		
		var customizedleftbannerwidth = parseInt($('.detailleftiframecontainer_customized').css('width'));	
		$('.detailleftiframecontainer_customized').css('marginLeft',(rightwidth-20-customizedleftbannerwidth)/2);
	
		
	}
	else if($(window).width()<=1024&$(window).width()>768)
	{	
	    var usagelength=$(window).width()-20;
		
		var rightwidth = usagelength; 
		var mainwidth = usagelength - 20 ;
		
		var rightlist = rightwidth/2-20;
		var rightimagewidth = rightlist;
		
		
		$('.videodetailcontainer').css('width',usagelength);
		$('.videowrapper').css('width',mainwidth);

		$('.detaildesktopfullwidthbanner iframe').css({'width':mainwidth,'height':(mainwidth)*110/1323});
		
		$('.detaildiscussionpanel').css('width',mainwidth);
		
		$('.rightcontainer').css({'width':rightwidth,'marginRight':0});
		$('.rightcontainerrow').css({'width':rightwidth-20});

		$('.detailreclist').css({'width':rightlist});
		$('.detailreclist img').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		
		
		$('.detailreclist .detailrectiframecontainer').css({'width':rightimagewidth,'height':rightimagewidth*9/16,'marginLeft':0});
		
		
		$('.detailrecadtag').css({'marginLeft':rightimagewidth-35-10});
		
		$('.detailleftadcustomized').css({'width':350,'marginLeft':(rightwidth-350-20)/2});
		
		$('.playlistcount').css({'height':rightimagewidth*9/16,'marginLeft':rightimagewidth-60});
		$('.playlistnum').css({'marginTop':(rightimagewidth*9/16-42)/2});

		$('.detailrecinfo').css({'width':rightimagewidth});

		$('.descriptionsection').css('width',mainwidth-145);
		$('.detailonginfocontainer').css('width',mainwidth-40);
	
		
		if(mainwidth>=728){
			$('#topdetailad .listadcontainertag').css('marginLeft',(mainwidth-728)/2+10);
			$('.detailcontentadiframecontainer').css('marginLeft',(mainwidth-728)/2);
		}
		else {
			$('#topdetailad .listadcontainertag').css('marginLeft',10);
			$('.detailcontentadiframecontainer').css('marginLeft',0);
		}
		

		
		if(mainwidth>=900){
			$('#bottomdetailad .listadcontainertag').css('marginLeft',(mainwidth-900)/2+10);
			$('.detailcontentadiframecontainer_900').css('marginLeft',(mainwidth-900)/2);
		}
		else {
			$('#bottomdetailad .listadcontainertag').css('marginLeft',10);
			$('.detailcontentadiframecontainer_900').css('marginLeft',0);
		}
		
		
		
		$('.detailleftadcontainer').css({'width':rightwidth-20,'marginLeft':0});
		
		$('.detailleftiframecontainer_315').css('marginLeft',(rightwidth-20-315)/2);
		$('.detailleftiframecontainer_300').css('marginLeft',(rightwidth-20-300)/2);
		
		var customizedleftbannerwidth = parseInt($('.detailleftiframecontainer_customized').css('width'));	
		$('.detailleftiframecontainer_customized').css('marginLeft',(rightwidth-20-customizedleftbannerwidth)/2);
		
	}
	
	
	else if($(window).width()<=768&$(window).width()>568)
	{	
		var usagelength=$(window).width()-20;
	
		$('.videodetailcontainer').css('width',usagelength);
		
		 var usagelength=$(window).width();
		
		var rightwidth = usagelength; 
		var mainwidth = usagelength - 20 ;
		
		var rightlist = (rightwidth-10)/2-10;
		var rightimagewidth = rightlist;
		
		
		$('.videodetailcontainer').css('width',usagelength);
		$('.videowrapper').css('width',mainwidth);

		$('.detaildesktopfullwidthbanner iframe').css({'width':mainwidth,'height':(mainwidth)*110/1323});	
	
		$('.detaildiscussionpanel').css('width',mainwidth);
		
		$('.rightcontainer').css({'width':rightwidth,'marginRight':0});
		
		$('.rightcontainerrow').css({'width':rightwidth-20});

		$('.detailreclist').css({'width':rightlist});
		$('.detailreclist img').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		
		$('.detailreclist .detailrectiframecontainer').css({'width':rightimagewidth,'height':rightimagewidth*9/16,'marginLeft':0});
		
		
		$('.detailrecadtag').css({'marginLeft':rightimagewidth-35-10});
		
		$('.detailleftadcustomized').css({'width':350,'marginLeft':(rightwidth-350-20)/2});
		
		$('.playlistcount').css({'height':rightimagewidth*9/16,'marginLeft':rightimagewidth-60});
		$('.playlistnum').css({'marginTop':(rightimagewidth*9/16-42)/2});

		$('.detailrecinfo').css({'width':rightimagewidth});
		
		$('.descriptionsection').css('width',mainwidth-145);
		$('.detailonginfocontainer').css('width',mainwidth-40);
		$('.mobileshowmore').css('width',mainwidth-2);
		
		
		$('#topdetailad .listadcontainertag').css('marginLeft',10);
		$('.detailcontentadiframecontainer').css('marginLeft',0);
		
		
		
		$('#bottomdetailad .listadcontainertag').css('marginLeft',10);
		$('.detailcontentadiframecontainer_900').css('marginLeft',0);
		
		
		
		$('.detailleftadcontainer').css({'width':rightwidth-20,'marginLeft':0});
		
		$('.detailleftiframecontainer_315').css('marginLeft',(rightwidth-20-315)/2);
		$('.detailleftiframecontainer_300').css('marginLeft',(rightwidth-20-300)/2);
		
		var customizedleftbannerwidth = parseInt($('.detailleftiframecontainer_customized').css('width'));	
		$('.detailleftiframecontainer_customized').css('marginLeft',(rightwidth-20-customizedleftbannerwidth)/2);
		
		
	}
	
	
	else{
		var usagelength=$(window).width();
		$('.videodetailcontainer').css('width',usagelength);
		
		 var usagelength=$(window).width();
		
		var rightwidth = usagelength; 
		var mainwidth = usagelength - 20 ;
		
		var rightlist = (rightwidth-10)/1-10;
		var rightimagewidth = rightlist;
		
		
		$('.videodetailcontainer').css('width',usagelength);
		$('.videowrapper').css('width',mainwidth);

		$('.detaildesktopfullwidthbanner iframe').css({'width':mainwidth,'height':(mainwidth)*100/350})
		
	
		$('.detaildiscussionpanel').css('width',mainwidth);
		
		$('.rightcontainer').css({'width':rightwidth,'marginRight':0});
		$('.rightcontainerrow').css({'width':rightwidth-20});

		$('.detailreclist').css({'width':rightlist});
		$('.detailreclist img').css({'width':rightimagewidth,'height':rightimagewidth*9/16});
		
		
		$('.detailreclist .detailrectiframecontainer').css({'width':rightimagewidth,'height':rightimagewidth*9/16,'marginLeft':0});
		
		
		
		$('.detailrecadtag').css({'marginLeft':rightimagewidth-35-10});
		$('.detailleftadcustomized').css({'width':350,'marginLeft':(rightwidth-350-20)/2});
		
		$('.playlistcount').css({'height':rightimagewidth*9/16,'marginLeft':rightimagewidth-60});
		$('.playlistnum').css({'marginTop':(rightimagewidth*9/16-42)/2});

		$('.detailrecinfo').css({'width':rightimagewidth});

		$('.descriptionsection').css('width',mainwidth-145);
		$('.detailonginfocontainer').css('width',mainwidth-20);
		$('.mobileshowmore').css('width',mainwidth-2);
		
		
		
		$('#topdetailad .listadcontainertag').css('marginLeft',($(window).width()-300)/2-5);
		$('.detailcontentadiframecontainer').css('marginLeft',($(window).width()-300)/2-10);
		
		$('.listleaderboardcontainerspecialmobile').css('marginLeft',($(window).width()-300)/2-10);


		$('#bottomdetailad .listadcontainertag').css('marginLeft',($(window).width()-315)/2-5);
		$('.detailcontentadiframecontainer_900').css('marginLeft',($(window).width()-300)/2-10);

		
		
		$('.detailleftadcontainer').css({'width':rightwidth-20,'marginLeft':0});
		
		$('.detailleftiframecontainer_315').css('marginLeft',(rightwidth-20-315)/2);
		$('.detailleftiframecontainer_300').css('marginLeft',(rightwidth-20-300)/2);
		
		var customizedleftbannerwidth = parseInt($('.detailleftiframecontainer_customized').css('width'));	
		$('.detailleftiframecontainer_customized').css('marginLeft',(rightwidth-20-customizedleftbannerwidth)/2);
		
		}
	
	
	
	
	 $('.video').css('height',parseInt($('.video').css('width'))*9/16);
}





function addlikehistory(videoid){
if(!localStorage.userFavorite) {
var myhis=new Array(); }
else{myhis=JSON.parse(localStorage.userFavorite)}
myhis.push(videoid);
myhis=$.unique(myhis);
localStorage.userFavorite=JSON.stringify(myhis);
}




function removelikehistory(videoid){
myhis=JSON.parse(localStorage.userFavorite);
myhis=jQuery.grep(myhis, function( a ) {
  return a !== videoid;
});
localStorage.userFavorite=JSON.stringify(myhis);
}




function checklikeornot(videoid)
{ 
if(localStorage.userFavorite) {
	myhis=JSON.parse(localStorage.userFavorite);
		if(jQuery.inArray( videoid, myhis )!=-1)
			{$('.favoritebutton').attr('id','selected'); 
			 $('.favoritebutton #likelabel').html('Liked');
			}

	}

}
