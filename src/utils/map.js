// @flow
import { GeoPoint } from 'types/geo-point';

const H = window.H;

export function toLineString(points: Array<GeoPoint>) {
    const linestring = new H.geo.LineString();
    points.forEach(point => {
        var parts = point.split(',');
        linestring.pushLatLngAlt(parts[0], parts[1]);
    })
    return linestring;
}