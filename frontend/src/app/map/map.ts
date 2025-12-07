import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import esriConfig from '@arcgis/core/config';
import WebMap from '@arcgis/core/WebMap';
import MapView from '@arcgis/core/views/MapView';
import Locate from '@arcgis/core/widgets/Locate';
import Search from '@arcgis/core/widgets/Search';

import Graphic from "@arcgis/core/Graphic";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import * as route from "@arcgis/core/rest/route";
import RouteParameters from "@arcgis/core/rest/support/RouteParameters";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map.html',
  styleUrls: ['./map.css']
})
export class Map implements OnInit, OnDestroy {

  @ViewChild('mapViewNode', { static: true }) mapViewEl!: ElementRef;
  view!: MapView;

  directions: { text: string; distance: number }[] = [];

  categories: string[] = [
    'Fitness', 'Arte Marțiale', 'Baschet', 'Bodybuilding',
    'CrossFit', 'Dans', 'Escaladă', 'Padel',
    'Polisportiv', 'Squash', 'Stadion', 'Tenis',
    'Yoga', 'Înot', 'Pilates'
  ];

  selectedCategory: string = '';

  ngOnInit(): void {
    this.initializeMap();
  }

  initializeMap(): void {

    esriConfig.apiKey = "AAPTxy8BH1VEsoebNVZXo8HurI2SVi81djFBXxVkYS2nQsgqrLCgmcTxwzj_E-v-LpeYG9bV_vJ5MIGXX3E_H5VNbEVKeRG_ccqh5nEs5MolbTyUyBpq5KUilaxvzbY6NJQLs2SshtRtDKykAZ2n1Z3CkTR-8HHn6LZ39IXSX9HYvJMjoSofMUVL8rNL2s8OS-to7i-0hAvHPaVr-sJiRAB2bCx6xCnEMi4GztV-5zO0f9o115NZ9NMIr8H5fuofIUoVAT1_L41SHFyZ";

    const webmap = new WebMap({
      portalItem: { id: "fe22e066a7c5443e8b22a9b1837fe5f1" }
    });

    this.view = new MapView({
      container: this.mapViewEl.nativeElement,
      map: webmap,
      zoom: 12,
      center: [26.1025, 44.4268]
    });

    // Locate
    this.view.ui.add(new Locate({ view: this.view }), "top-left");

    // Search
    this.view.ui.add(new Search({ view: this.view }), "top-right");

    this.view.when(() => {
      console.log("MAP READY");

      // Routing click handler
      this.view.on("click", (evt) => this.handleMapClick(evt));
    });
  }

  handleMapClick(event: any): void {
    if (!this.view) return;

    const graphics = this.view.graphics.toArray();

    if (graphics.length === 0) {
      this.addStop("origin", event.mapPoint);
      return;
    }

    if (graphics.length === 1) {
      this.addStop("destination", event.mapPoint);
      this.calculateRoute();
      return;
    }

    // Reset
    this.view.graphics.removeAll();
    this.directions = [];
    this.addStop("origin", event.mapPoint);
  }

  addStop(type: string, point: any): void {
    const symbol = new SimpleMarkerSymbol({
      color: type === "origin" ? "white" : "black",
      size: "10px",
      outline: { color: "black", width: 1 }
    });

    const graphic = new Graphic({
      geometry: point,
      symbol
    });

    this.view.graphics.add(graphic);
  }

  async calculateRoute(): Promise<void> {
    const routeUrl =
      "https://route-api.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World";

    const graphics = this.view.graphics.toArray();
    if (graphics.length < 2) return;

    const params = new RouteParameters({
      stops: new FeatureSet({
        features: graphics
      }),
      returnDirections: true
    });

    try {
      const result = await route.solve(routeUrl, params);

      const r = result.routeResults[0];
      if (!r || !r.route || !r.directions || !r.directions.features) {
        console.warn("No route or directions returned.");
        return;
      }

      // Add route line
      r.route.symbol = new SimpleLineSymbol({
        color: [5, 150, 255],
        width: 5
      });

      this.view.graphics.add(r.route);

      // Extract directions
      const steps = r.directions.features;

      this.directions = steps.map((s: any) => ({
        text: s.attributes.text,
        distance: Math.round(s.attributes.length * 1609.34)
      }));

    } catch (err) {
      console.error("ROUTE ERROR:", err);
    }
  }

  filterByCategory(category: string): void {
    if (!this.view || !this.view.map) return;

    const layerFound = this.view.map.allLayers.find((l: any) =>
      l.title?.includes("SportsCenters")
    );

    if (!layerFound) {
      console.error("SportsCenters layer not found");
      return;
    }

    const featureLayer = layerFound as FeatureLayer;

    featureLayer.definitionExpression = category
      ? `Category = '${category}'`
      : "";
  }

  ngOnDestroy(): void {
    if (this.view) this.view.destroy();
  }
}
