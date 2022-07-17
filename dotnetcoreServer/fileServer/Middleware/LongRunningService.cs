using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;

public class LongRunningService:BackgroundService{
    private readonly BackgroundWorkQuenue quenue;

    public LongRunningService(BackgroundWorkQuenue quenue){
        this.quenue = quenue;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while(!stoppingToken.IsCancellationRequested){
            var workItem = await quenue.DequeueAsync(stoppingToken);
            await workItem(stoppingToken);
        }
    }

}