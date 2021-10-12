import GeneralResult from './generalResult';

/// <summary>
/// /api/weather/{city}的响应结果
/// </summary>
export default interface WeatherResult extends GeneralResult {
    /**城市 */
    currentCity: string;
    /**日期 */
    date: string;
    /**天气 */
    weather: string;
    /**天气图片 */
    weatherImageUrl: string;
    /**温度范围 */
    temperature: string;
    /**当前温度 */
    currentTemp: string;
    /**风速 */
    wind: string;
    /**湿度 */
    wet: string;
}
