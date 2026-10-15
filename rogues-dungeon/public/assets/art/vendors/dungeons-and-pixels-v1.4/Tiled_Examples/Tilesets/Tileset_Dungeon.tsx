<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.11" tiledversion="1.12.2" name="Tileset_Dungeon" tilewidth="32" tileheight="32" tilecount="108" columns="12">
 <image source="../../Tilesets/Tileset_Dungeon.png" width="384" height="288"/>
 <tile id="43">
  <animation>
   <frame tileid="43" duration="400"/>
   <frame tileid="44" duration="400"/>
   <frame tileid="45" duration="400"/>
   <frame tileid="46" duration="400"/>
  </animation>
 </tile>
 <tile id="55">
  <animation>
   <frame tileid="55" duration="400"/>
   <frame tileid="56" duration="400"/>
   <frame tileid="57" duration="400"/>
   <frame tileid="58" duration="400"/>
  </animation>
 </tile>
 <tile id="67">
  <animation>
   <frame tileid="67" duration="400"/>
   <frame tileid="68" duration="400"/>
   <frame tileid="69" duration="400"/>
   <frame tileid="70" duration="400"/>
  </animation>
 </tile>
 <tile id="79">
  <animation>
   <frame tileid="79" duration="400"/>
   <frame tileid="80" duration="400"/>
   <frame tileid="81" duration="400"/>
   <frame tileid="82" duration="400"/>
  </animation>
 </tile>
 <tile id="91">
  <animation>
   <frame tileid="91" duration="400"/>
   <frame tileid="92" duration="400"/>
   <frame tileid="93" duration="400"/>
   <frame tileid="94" duration="400"/>
  </animation>
 </tile>
 <tile id="103">
  <animation>
   <frame tileid="103" duration="400"/>
   <frame tileid="104" duration="400"/>
   <frame tileid="105" duration="400"/>
   <frame tileid="106" duration="400"/>
  </animation>
 </tile>
 <wangsets>
  <wangset name="Dungeon room walls" type="mixed" tile="-1">
   <wangcolor name="Walkable floor" color="#ff0000" tile="-1" probability="1"/>
   <wangtile tileid="0" wangid="0,0,1,1,1,0,0,0"/>
   <wangtile tileid="1" wangid="0,0,1,1,1,1,1,0"/>
   <wangtile tileid="5" wangid="0,0,0,0,1,1,1,0"/>
   <wangtile tileid="6" wangid="1,1,1,0,1,1,1,1"/>
   <wangtile tileid="8" wangid="1,1,1,1,1,0,1,1"/>
   <wangtile tileid="12" wangid="1,1,1,1,1,0,0,0"/>
   <wangtile tileid="13" wangid="1,1,1,1,1,1,1,1"/>
   <wangtile tileid="17" wangid="1,0,0,0,1,1,1,1"/>
   <wangtile tileid="30" wangid="1,0,1,1,1,1,1,1"/>
   <wangtile tileid="32" wangid="1,1,1,1,1,1,1,0"/>
   <wangtile tileid="48" wangid="1,1,1,0,0,0,0,0"/>
   <wangtile tileid="49" wangid="1,1,1,0,0,0,1,1"/>
   <wangtile tileid="53" wangid="1,0,0,0,0,0,1,1"/>
   <properties>
    <property name="tiled-ai:terrain-names" value="[&quot;Walkable floor&quot;]"/>
   </properties>
  </wangset>
 </wangsets>
</tileset>
